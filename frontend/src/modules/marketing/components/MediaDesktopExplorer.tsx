import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  File,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderInput,
  FolderOpen,
  Grid2X2,
  HardDrive,
  List,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { uploadFileWithProgress } from "@/lib/upload-file";
import { toastApiError } from "@/lib/api-error";
import type { MediaItemKind } from "@/modules/marketing/types";
import {
  useMarketingMediaTree,
  useCreateMarketingFolder,
  useRegisterMarketingFile,
  useRenameMarketingMedia,
  useDeleteMarketingMedia,
  useMoveMarketingMedia,
} from "@/api/marketing";
import {
  useAdminMediaTree,
  useCreateAdminFolder,
  useRegisterAdminFile,
  useRenameAdminMedia,
  useDeleteAdminMedia,
  useMoveAdminMedia,
  type AdminMediaDto,
} from "@/api/admin-media";
import { formatMediaSize } from "@/modules/marketing/mock-data/media";
import { MarketingConfirmDialog } from "@/modules/marketing/components/MarketingConfirmDialog";
import { usePermissions } from "@/modules/permissions/usePermission";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { apiUrl } from "@/lib/api-base";

/** Admin tree omits account/company; marketing includes them — explorer needs both. */
type ExplorerMediaItem = AdminMediaDto & {
  accountId?: number;
  companyId?: number;
};
type ViewMode = "icons" | "list";
type SortKey = "name" | "modified" | "size";

type FolderNavNode = { folder: ExplorerMediaItem; depth: number };

function buildFolderNav(items: ExplorerMediaItem[]): FolderNavNode[] {
  const folders = items.filter((i) => i.kind === "folder");
  const byParent = new Map<string | null, ExplorerMediaItem[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(f);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const out: FolderNavNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const folder of byParent.get(parentId) ?? []) {
      out.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function sortMediaItems(list: ExplorerMediaItem[], sortKey: SortKey, sortDir: "asc" | "desc") {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (a.kind !== "folder" && b.kind === "folder") return 1;
    if (sortKey === "size") {
      return ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0)) * dir;
    }
    if (sortKey === "modified") {
      return (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()) * dir;
    }
    return a.name.localeCompare(b.name) * dir;
  });
}

function readStoredViewMode(key: string): ViewMode {
  try {
    const v = localStorage.getItem(key);
    if (v === "icons" || v === "list") return v;
  } catch {
    /* ignore */
  }
  return "icons";
}

function readStoredSort(key: string): { sortKey: SortKey; sortDir: "asc" | "desc" } {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as { sortKey?: SortKey; sortDir?: "asc" | "desc" };
      if (parsed.sortKey === "name" || parsed.sortKey === "modified" || parsed.sortKey === "size") {
        return {
          sortKey: parsed.sortKey,
          sortDir: parsed.sortDir === "desc" ? "desc" : "asc",
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { sortKey: "name", sortDir: "asc" };
}
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim());
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

/** Download via authenticated API proxy so the file saves locally (not a redirect/preview). */
async function downloadMediaFile(
  item: ExplorerMediaItem,
  opts: { source: "marketing" | "admin"; accountId?: number },
) {
  if (!item?.id || item.kind === "folder") {
    toast.error("Nothing to download");
    return;
  }
  const filenameFallback = item.name?.trim() || "download";
  const url =
    opts.source === "admin"
      ? apiUrl(`/api/admin/media/${encodeURIComponent(String(item.id))}/download`)
      : apiUrl(
          `/api/marketing/media/${encodeURIComponent(String(item.id))}/download?accountId=${opts.accountId}`,
        );
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    let message = "Download failed";
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const filename = filenameFromDisposition(
    res.headers.get("Content-Disposition"),
    filenameFallback,
  );
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  toast.success(`Saved ${filename}`);
}

function kindIcon(kind: MediaItemKind, className?: string) {
  const cls = cn("h-5 w-5 shrink-0", className);
  switch (kind) {
    case "folder":
      return <Folder className={cn(cls, "text-amber-500 fill-amber-400/80")} />;
    case "image":
      return <FileImage className={cn(cls, "text-sky-500")} />;
    case "document":
      return <FileText className={cn(cls, "text-rose-500")} />;
    case "video":
      return <FileVideo className={cn(cls, "text-violet-500")} />;
    default:
      return <File className={cn(cls, "text-muted-foreground")} />;
  }
}

function largeKindIcon(kind: MediaItemKind) {
  switch (kind) {
    case "folder":
      return <Folder className="h-10 w-10 text-amber-500 fill-amber-400/90 drop-shadow-sm" />;
    case "image":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-500/15 ring-1 ring-sky-500/25">
          <FileImage className="h-6 w-6 text-sky-600" />
        </div>
      );
    case "document":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-500/15 ring-1 ring-rose-500/25">
          <FileText className="h-6 w-6 text-rose-600" />
        </div>
      );
    case "video":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-500/15 ring-1 ring-violet-500/25">
          <FileVideo className="h-6 w-6 text-violet-600" />
        </div>
      );
    default:
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted ring-1 ring-border">
          <File className="h-6 w-6 text-muted-foreground" />
        </div>
      );
  }
}

function MediaThumb({
  item,
  size = "lg",
}: {
  item: ExplorerMediaItem;
  size?: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const src = item.url ? resolveFileUrl(item.url) : "";
  const isImage = item.kind === "image" && Boolean(src) && !failed;
  const isVideo = item.kind === "video" && Boolean(src) && !failed;

  if (item.kind === "folder") {
    return size === "lg" ? largeKindIcon("folder") : kindIcon("folder");
  }

  if (isImage) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-md bg-muted ring-1 ring-border",
          size === "lg" ? "h-14 w-14" : "h-8 w-8",
        )}
      >
        <img
          src={src}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (isVideo && size === "lg") {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted ring-1 ring-border">
        <video
          src={src}
          muted
          preload="metadata"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <FileVideo className="h-5 w-5 text-white drop-shadow" />
        </div>
      </div>
    );
  }

  return size === "lg" ? largeKindIcon(item.kind) : kindIcon(item.kind);
}

export function MediaDesktopExplorer({
  source = "marketing",
  accountId,
  className,
  onBackToAllProjects,
}: {
  /** marketing = digital project vault; admin = Manage company storage */
  source?: "marketing" | "admin";
  accountId?: number;
  /** @deprecated use accountId */
  initialClientId?: string;
  className?: string;
  /** When at vault root, Up / All projects returns to the multi-project home. */
  onBackToAllProjects?: () => void;
}) {
  const isAdmin = source === "admin";
  const marketingTree = useMarketingMediaTree(isAdmin ? undefined : accountId);
  const adminTree = useAdminMediaTree(isAdmin);

  const createMarketingFolder = useCreateMarketingFolder();
  const registerMarketingFile = useRegisterMarketingFile();
  const renameMarketingMedia = useRenameMarketingMedia();
  const deleteMarketingMedia = useDeleteMarketingMedia();
  const moveMarketingMedia = useMoveMarketingMedia();

  const createAdminFolder = useCreateAdminFolder();
  const registerAdminFile = useRegisterAdminFile();
  const renameAdminMedia = useRenameAdminMedia();
  const deleteAdminMedia = useDeleteAdminMedia();
  const moveAdminMedia = useMoveAdminMedia();

  const { data, isLoading, isError, refetch } = isAdmin ? adminTree : marketingTree;
  const renameMedia = isAdmin ? renameAdminMedia : renameMarketingMedia;
  const deleteMedia = isAdmin ? deleteAdminMedia : deleteMarketingMedia;
  const moveMedia = isAdmin ? moveAdminMedia : moveMarketingMedia;

  const { can } = usePermissions();
  const perm = isAdmin ? "admin_media" : "marketing_media";
  const canEdit = can(perm, "edit");
  const canDelete = can(perm, "delete");
  const canCreate = can(perm, "create");
  const items = (data?.items ?? []) as ExplorerMediaItem[];

  const root = useMemo(
    () => items.find((i) => i.parentId == null && i.kind === "folder"),
    [items],
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prefsKey = isAdmin ? "cms-media-admin" : `cms-media-mkt:${accountId ?? "x"}`;
  const [viewMode, setViewMode] = useState<ViewMode>(() => readStoredViewMode(`${prefsKey}:view`));
  const initialSort = useMemo(() => readStoredSort(`${prefsKey}:sort`), [prefsKey]);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort.sortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort.sortDir);
  const [search, setSearch] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ExplorerMediaItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<{
    index: number;
    total: number;
    pct: number;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`${prefsKey}:view`, viewMode);
    } catch {
      /* ignore */
    }
  }, [prefsKey, viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(`${prefsKey}:sort`, JSON.stringify({ sortKey, sortDir }));
    } catch {
      /* ignore */
    }
  }, [prefsKey, sortKey, sortDir]);

  useEffect(() => {
    if (!root) return;
    setCurrentId(root.id);
    setHistory([root.id]);
    setHistoryIndex(0);
  }, [root?.id]);

  const byId = useMemo(() => {
    const map = new Map<string, ExplorerMediaItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const navigate = useCallback(
    (id: string, pushHistory = true) => {
      if (!byId.has(id)) return;
      setCurrentId(id);
      setSelectedId(null);
      setSearch("");
      if (!pushHistory) return;
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(id);
        return next;
      });
      setHistoryIndex((i) => i + 1);
    },
    [byId, historyIndex],
  );

  const goBack = () => {
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setCurrentId(history[next]);
    setSelectedId(null);
  };

  const goForward = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setCurrentId(history[next]);
    setSelectedId(null);
  };

  const goUp = () => {
    const current = currentId ? byId.get(currentId) : undefined;
    if (current?.parentId) {
      navigate(current.parentId);
      return;
    }
    onBackToAllProjects?.();
  };

  const path = useMemo(() => {
    const crumbs: ExplorerMediaItem[] = [];
    let cur = currentId ? byId.get(currentId) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      crumbs.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return crumbs;
  }, [currentId, byId]);

  const children = useMemo(() => {
    const list = items.filter((item) => item.parentId === currentId);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((item) => item.name.toLowerCase().includes(q))
      : list;
    return sortMediaItems(filtered, sortKey, sortDir);
  }, [items, currentId, search, sortKey, sortDir]);

  const folderBytes = useMemo(
    () => children.reduce((sum, i) => sum + (i.kind === "folder" ? 0 : i.sizeBytes ?? 0), 0),
    [children],
  );

  const selected = selectedId ? byId.get(selectedId) : null;
  const currentFolder = currentId ? byId.get(currentId) : null;
  /** Prefer explicit selection; otherwise rename the folder currently open. */
  const renameTarget = selected ?? currentFolder;
  const canDeleteItem = useCallback(
    (item: ExplorerMediaItem | null | undefined) => {
      if (!item || item.parentId == null) return false;
      if (canDelete) return true;
      return !isAdmin && canEdit && item.kind === "folder";
    },
    [canDelete, canEdit, isAdmin],
  );

  const openItem = (item: ExplorerMediaItem) => {
    if (item.kind === "folder") {
      navigate(item.id);
      return;
    }
    const href = item.url ? resolveFileUrl(item.url) : "";
    if (item.kind === "image" && href) {
      setPreviewItem(item);
      return;
    }
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    toast.message(item.name, {
      description: `${item.extension?.toUpperCase() ?? "File"} · ${formatMediaSize(item.sizeBytes)}`,
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !currentId) return;
    const list = Array.from(files);
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i]!;
        setUploadState({ index: i + 1, total: list.length, pct: 0, name: file.name });
        const uploaded = await uploadFileWithProgress(
          file,
          isAdmin ? "admin" : "marketing",
          {
            onProgress: (pct) =>
              setUploadState((prev) => (prev ? { ...prev, pct } : prev)),
          },
        );
        if (isAdmin) {
          await registerAdminFile.mutateAsync({
            parentId: currentId,
            name: file.name,
            url: uploaded.publicUrl ?? uploaded.url,
            storageKey: uploaded.key,
            mimetype: uploaded.mimetype ?? file.type,
            sizeBytes: uploaded.size ?? file.size,
          });
        } else {
          await registerMarketingFile.mutateAsync({
            accountId: accountId!,
            parentId: currentId,
            name: file.name,
            url: uploaded.publicUrl ?? uploaded.url,
            storageKey: uploaded.key,
            mimetype: uploaded.mimetype ?? file.type,
            sizeBytes: uploaded.size ?? file.size,
          });
        }
      }
      toast.success(list.length === 1 ? "File uploaded" : `${list.length} files uploaded`);
      await refetch();
    } catch (err) {
      toastApiError(err, "Upload failed");
    } finally {
      setUploadState(null);
    }
  };

  const onCreateFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim() || !currentId) return;
    try {
      if (isAdmin) {
        await createAdminFolder.mutateAsync({
          parentId: currentId,
          name: name.trim(),
        });
      } else {
        await createMarketingFolder.mutateAsync({
          accountId: accountId!,
          parentId: currentId,
          name: name.trim(),
        });
      }
      toast.success(`Created folder "${name.trim()}"`);
      await refetch();
    } catch (err) {
      toastApiError(err, "Could not create folder");
    }
  };

  const openRename = (item?: ExplorerMediaItem | null) => {
    const target = item ?? renameTarget;
    if (!target) return;
    setSelectedId(target.id);
    setRenameValue(target.name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const target = selectedId ? byId.get(selectedId) : renameTarget;
    if (!target || !renameValue.trim()) return;
    try {
      if (isAdmin) {
        await renameAdminMedia.mutateAsync({
          id: target.id,
          name: renameValue.trim(),
        });
      } else {
        await renameMarketingMedia.mutateAsync({
          id: target.id,
          name: renameValue.trim(),
          accountId: accountId!,
        });
      }
      toast.success("Renamed");
      setRenameOpen(false);
      await refetch();
    } catch (err) {
      toastApiError(err, "Failed to rename");
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.parentId == null) return;
    try {
      if (isAdmin) {
        await deleteAdminMedia.mutateAsync(selected.id);
      } else {
        await deleteMarketingMedia.mutateAsync({ id: selected.id, accountId: accountId! });
      }
      toast.success("Deleted");
      setDeleteOpen(false);
      setSelectedId(null);
      await refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete");
    }
  };

  const canDeleteSelected = canDeleteItem(selected);
  const canMoveSelected = selected != null && selected.parentId != null && canEdit;
  const canDownloadSelected =
    selected != null && selected.kind !== "folder";

  const handleDownload = async (item: ExplorerMediaItem | null | undefined) => {
    if (!item || item.kind === "folder") return;
    setDownloading(true);
    try {
      await downloadMediaFile(item, {
        source: isAdmin ? "admin" : "marketing",
        accountId,
      });
    } catch (err) {
      toastApiError(err, "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const folderNav = useMemo(() => buildFolderNav(items), [items]);

  const moveDestinations = useMemo(() => {
    if (!selected) return [];
    const excluded = new Set<string>([selected.id]);
    if (selected.kind === "folder") {
      const stack = [selected.id];
      while (stack.length) {
        const id = stack.pop()!;
        for (const item of items) {
          if (item.parentId === id && !excluded.has(item.id)) {
            excluded.add(item.id);
            if (item.kind === "folder") stack.push(item.id);
          }
        }
      }
    }
    return folderNav
      .map((n) => n.folder)
      .filter((f) => !excluded.has(f.id) && f.id !== root?.id);
  }, [selected, folderNav, items, root?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (renameOpen || moveOpen || deleteOpen || previewItem) return;

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (e.key === "Enter" && selectedId) {
        const item = byId.get(selectedId);
        if (!item) return;
        e.preventDefault();
        if (item.kind === "folder") {
          navigate(item.id);
          return;
        }
        const href = item.url ? resolveFileUrl(item.url) : "";
        if (item.kind === "image" && href) {
          setPreviewItem(item);
          return;
        }
        if (href) window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      if (e.key === "F2" && canEdit) {
        const target = selectedId ? byId.get(selectedId) : currentId ? byId.get(currentId) : null;
        if (!target) return;
        e.preventDefault();
        setSelectedId(target.id);
        setRenameValue(target.name);
        setRenameOpen(true);
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        canDeleteItem(byId.get(selectedId))
      ) {
        e.preventDefault();
        setDeleteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    renameOpen,
    moveOpen,
    deleteOpen,
    previewItem,
    selectedId,
    currentId,
    byId,
    canEdit,
    canDelete,
    canDeleteItem,
    navigate,
  ]);

  const openMove = (item?: ExplorerMediaItem | null) => {
    const target = item ?? selected;
    if (!target || target.parentId == null) return;
    setSelectedId(target.id);
    const defaultParent =
      target.parentId === root?.id ? (root?.id ?? null) : target.parentId;
    setMoveTargetParentId(defaultParent);
    setMoveOpen(true);
  };

  const handleMove = async () => {
    if (!selected) return;
    const parentId =
      moveTargetParentId === root?.id || moveTargetParentId == null
        ? root?.id ?? null
        : moveTargetParentId;
    if (parentId === selected.parentId) {
      setMoveOpen(false);
      return;
    }
    try {
      if (isAdmin) {
        await moveAdminMedia.mutateAsync({ id: selected.id, parentId });
      } else {
        await moveMarketingMedia.mutateAsync({
          id: selected.id,
          accountId: accountId!,
          parentId,
        });
      }
      toast.success("Moved");
      setMoveOpen(false);
      setSelectedId(null);
      await refetch();
    } catch (err) {
      toastApiError(err, "Failed to move");
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-border/80 bg-[#eceff3] shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] dark:bg-[#1a1d23]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-black/5 bg-gradient-to-b from-[#f7f8fa] to-[#e8ebf0] px-3 py-2 dark:border-white/5 dark:from-[#252830] dark:to-[#1e2128]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] ring-1 ring-black/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] ring-1 ring-black/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] ring-1 ring-black/10" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate text-xs font-medium text-foreground/80">
            {isAdmin ? "Company storage" : "Digital Media"} — {currentFolder?.name ?? "Vault"}
          </span>
        </div>
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-[#f3f4f7] px-2 py-1.5 dark:border-white/5 dark:bg-[#22252c]">
        <div className="flex items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={historyIndex <= 0} onClick={goBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={historyIndex >= history.length - 1} onClick={goForward}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!currentFolder?.parentId && !onBackToAllProjects}
            onClick={goUp}
            title={currentFolder?.parentId ? "Up" : "All projects"}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-md border bg-background/90 px-2 py-1 text-[11px]">
          {onBackToAllProjects ? (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onBackToAllProjects}
                className="rounded px-1 py-0.5 text-muted-foreground hover:bg-muted"
              >
                All projects
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </span>
          ) : null}
          {path.map((crumb, i) => (
            <span key={crumb.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <button
                type="button"
                onClick={() => navigate(crumb.id)}
                className={cn(
                  "rounded px-1 py-0.5 hover:bg-muted",
                  i === path.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="relative w-full sm:w-44">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this folder" className="h-7 pl-7 text-[11px]" />
        </div>

        <div className="flex items-center gap-0.5 rounded-md border bg-background/60 p-0.5">
          <Button type="button" size="icon" variant={viewMode === "icons" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => setViewMode("icons")}>
            <Grid2X2 className="h-3 w-3" />
          </Button>
          <Button type="button" size="icon" variant={viewMode === "list" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => setViewMode("list")}>
            <List className="h-3 w-3" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]">
              <ArrowUpDown className="h-3 w-3" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuRadioGroup
              value={`${sortKey}:${sortDir}`}
              onValueChange={(v) => {
                const [key, dir] = v.split(":") as [SortKey, "asc" | "desc"];
                setSortKey(key);
                setSortDir(dir);
              }}
            >
              <DropdownMenuRadioItem value="name:asc">Name A–Z</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name:desc">Name Z–A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modified:desc">Newest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modified:asc">Oldest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size:desc">Largest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size:asc">Smallest first</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {canCreate && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={onCreateFolder}>
            <Plus className="h-3 w-3" />
            New folder
          </Button>
        )}
        {canCreate && (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            disabled={uploadState != null}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadState ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Upload
          </Button>
        )}
        {canDownloadSelected && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px]"
            disabled={downloading}
            onClick={() => void handleDownload(selected)}
          >
            {downloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Download
          </Button>
        )}
        {renameTarget && canEdit && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => openRename()}>
            <Pencil className="h-3 w-3" />
            Rename
          </Button>
        )}
        {canMoveSelected && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => openMove()}>
            <FolderInput className="h-3 w-3" />
            Move
          </Button>
        )}
        {canDeleteSelected && canDelete && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px] text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-black/5 bg-[#f7f8fa] p-2 dark:border-white/5 dark:bg-[#1e2128] sm:block">
          <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          {folderNav.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => navigate(folder.id)}
              onContextMenu={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                openRename(folder);
              }}
              title={canEdit ? "Right-click to rename" : folder.name}
              style={{ paddingLeft: 6 + depth * 12 }}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md py-1 pr-1.5 text-left text-[11px]",
                currentId === folder.id
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {currentId === folder.id ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </aside>

        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto bg-[#fafbfc] p-3 dark:bg-[#16181d]",
            dragOver && "ring-2 ring-inset ring-primary/40 bg-primary/[0.04]",
          )}
          onClick={() => setSelectedId(null)}
          onDragEnter={(e) => {
            if (!canCreate) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            if (!canCreate) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOver(false);
          }}
          onDrop={(e) => {
            if (!canCreate) return;
            e.preventDefault();
            setDragOver(false);
            void handleUpload(e.dataTransfer.files);
          }}
        >
          {dragOver && canCreate ? (
            <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/5">
              <div className="rounded-lg bg-background/90 px-4 py-3 text-center shadow-sm">
                <Upload className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-sm font-medium">Drop files to upload</p>
                <p className="text-[11px] text-muted-foreground">Into “{currentFolder?.name ?? "this folder"}”</p>
              </div>
            </div>
          ) : null}
          {uploadState ? (
            <div className="mb-3 rounded-lg border bg-background/90 px-3 py-2 shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-medium">
                  Uploading {uploadState.index}/{uploadState.total}: {uploadState.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{uploadState.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${uploadState.pct}%` }}
                />
              </div>
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex h-full min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vault…
            </div>
          ) : isError ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
              <HardDrive className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Couldn’t load media vault</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Check your connection and permissions, then try again.
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : children.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
              <HardDrive className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {search.trim() ? "No matches in this folder" : "This folder is empty"}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {search.trim()
                  ? "Try a different search, or clear the filter."
                  : canCreate
                    ? "Drag & drop files here, or use Upload."
                    : "Nothing stored here yet."}
              </p>
              {canCreate && !search.trim() && (
                <Button type="button" size="sm" className="mt-2 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Upload files
                </Button>
              )}
            </div>
          ) : viewMode === "icons" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {children.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        openItem(item);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border border-transparent px-2 py-3 text-center",
                        selectedId === item.id ? "border-primary/30 bg-primary/10" : "hover:border-border hover:bg-muted/50",
                      )}
                    >
                      <MediaThumb item={item} size="lg" />
                      <span className="line-clamp-2 w-full text-[11px] leading-tight">{item.name}</span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem
                      onSelect={() => {
                        setSelectedId(item.id);
                        openItem(item);
                      }}
                    >
                      Open
                      <ContextMenuShortcut>Enter</ContextMenuShortcut>
                    </ContextMenuItem>
                    {item.kind !== "folder" ? (
                      <ContextMenuItem
                        onSelect={() => {
                          setSelectedId(item.id);
                          void handleDownload(item);
                        }}
                      >
                        Download
                      </ContextMenuItem>
                    ) : null}
                    {canEdit ? (
                      <ContextMenuItem
                        onSelect={() => openRename(item)}
                      >
                        Rename
                        <ContextMenuShortcut>F2</ContextMenuShortcut>
                      </ContextMenuItem>
                    ) : null}
                    {canEdit && item.parentId != null ? (
                      <ContextMenuItem onSelect={() => openMove(item)}>
                        Move…
                      </ContextMenuItem>
                    ) : null}
                    {canDeleteItem(item) ? (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            setSelectedId(item.id);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                          <ContextMenuShortcut>Del</ContextMenuShortcut>
                        </ContextMenuItem>
                      </>
                    ) : null}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_100px] gap-2 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Name</span>
                <span className="text-right">Size</span>
                <span className="text-right">Modified</span>
              </div>
              {children.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        openItem(item);
                      }}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_80px_100px] gap-2 border-b border-border/50 px-3 py-2 text-left text-[11px] last:border-0",
                        selectedId === item.id ? "bg-primary/10" : "hover:bg-muted/40",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MediaThumb item={item} size="sm" />
                        <span className="truncate font-medium">{item.name}</span>
                      </span>
                      <span className="text-right text-muted-foreground">
                        {item.kind === "folder" ? "—" : formatMediaSize(item.sizeBytes)}
                      </span>
                      <span className="text-right text-muted-foreground">
                        {format(new Date(item.modifiedAt), "MMM d, yyyy")}
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem
                      onSelect={() => {
                        setSelectedId(item.id);
                        openItem(item);
                      }}
                    >
                      Open
                      <ContextMenuShortcut>Enter</ContextMenuShortcut>
                    </ContextMenuItem>
                    {item.kind !== "folder" ? (
                      <ContextMenuItem
                        onSelect={() => {
                          setSelectedId(item.id);
                          void handleDownload(item);
                        }}
                      >
                        Download
                      </ContextMenuItem>
                    ) : null}
                    {canEdit ? (
                      <ContextMenuItem onSelect={() => openRename(item)}>
                        Rename
                        <ContextMenuShortcut>F2</ContextMenuShortcut>
                      </ContextMenuItem>
                    ) : null}
                    {canEdit && item.parentId != null ? (
                      <ContextMenuItem onSelect={() => openMove(item)}>
                        Move…
                      </ContextMenuItem>
                    ) : null}
                    {canDeleteItem(item) ? (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            setSelectedId(item.id);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                          <ContextMenuShortcut>Del</ContextMenuShortcut>
                        </ContextMenuItem>
                      </>
                    ) : null}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </main>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 bg-[#eef0f4] px-3 py-1.5 text-[10px] text-muted-foreground dark:border-white/5 dark:bg-[#1e2128]">
        <span>
          {children.length} item{children.length === 1 ? "" : "s"}
          {folderBytes > 0 ? ` · ${formatMediaSize(folderBytes)}` : ""}
          {selected ? ` · Selected: ${selected.name}` : ""}
        </span>
        <span className="hidden sm:inline">
          Drag & drop to upload · F2 rename · Enter open · Esc clear
        </span>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={renameMedia.isPending || !renameValue.trim()} onClick={() => void handleRename()}>
              {renameMedia.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setMoveTargetParentId(root?.id ?? null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                (moveTargetParentId == null || moveTargetParentId === root?.id)
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate">
                {isAdmin
                  ? `Company storage${root ? ` (${root.name})` : ""}`
                  : `Root / account vault${root ? ` (${root.name})` : ""}`}
              </span>
            </button>
            {moveDestinations.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setMoveTargetParentId(folder.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  moveTargetParentId === folder.id
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={moveMedia.isPending} onClick={() => void handleMove()}>
              {moveMedia.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete item?"
        description={selected ? `"${selected.name}" will be permanently removed.` : undefined}
        loading={deleteMedia.isPending}
        onConfirm={() => void handleDelete()}
      />

      <Dialog open={previewItem != null} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{previewItem?.name ?? "Preview"}</DialogTitle>
          </DialogHeader>
          {previewItem?.url ? (
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-muted/40">
              <img
                src={resolveFileUrl(previewItem.url)}
                alt={previewItem.name}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            {previewItem ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={downloading}
                  onClick={() => void handleDownload(previewItem)}
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
                {previewItem.url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(resolveFileUrl(previewItem.url!), "_blank", "noopener,noreferrer")}
                  >
                    Open original
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button size="sm" onClick={() => setPreviewItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
