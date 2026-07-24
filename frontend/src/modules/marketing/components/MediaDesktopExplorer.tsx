import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  type MarketingMediaDto,
} from "@/api/marketing";
import { formatMediaSize } from "@/modules/marketing/mock-data/media";
import { MarketingConfirmDialog } from "@/modules/marketing/components/MarketingConfirmDialog";
import { usePermissions } from "@/modules/permissions/usePermission";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { apiUrl } from "@/lib/api-base";

type ViewMode = "icons" | "list";

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
async function downloadMediaFile(item: MarketingMediaDto, accountId: number) {
  if (!item?.id || item.kind === "folder") {
    toast.error("Nothing to download");
    return;
  }
  const filenameFallback = item.name?.trim() || "download";
  const url = apiUrl(
    `/api/marketing/media/${encodeURIComponent(String(item.id))}/download?accountId=${accountId}`,
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
  item: MarketingMediaDto;
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
  accountId,
  className,
  onBackToAllProjects,
}: {
  accountId: number;
  /** @deprecated use accountId */
  initialClientId?: string;
  className?: string;
  /** When at vault root, Up / All projects returns to the multi-project home. */
  onBackToAllProjects?: () => void;
}) {
  const { data, isLoading, isError, refetch } = useMarketingMediaTree(accountId);
  const createFolder = useCreateMarketingFolder();
  const registerFile = useRegisterMarketingFile();
  const renameMedia = useRenameMarketingMedia();
  const deleteMedia = useDeleteMarketingMedia();
  const moveMedia = useMoveMarketingMedia();
  const { can } = usePermissions();
  const canEdit = can("marketing_media", "edit");
  const canDelete = can("marketing_media", "delete");
  const canCreate = can("marketing_media", "create");
  const items = data?.items ?? [];

  const root = useMemo(
    () => items.find((i) => i.parentId == null && i.kind === "folder"),
    [items],
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("icons");
  const [search, setSearch] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MarketingMediaDto | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!root) return;
    setCurrentId(root.id);
    setHistory([root.id]);
    setHistoryIndex(0);
  }, [root?.id]);

  const byId = useMemo(() => {
    const map = new Map<string, MarketingMediaDto>();
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
    const crumbs: MarketingMediaDto[] = [];
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
    const list = items
      .filter((item) => item.parentId === currentId)
      .sort((a, b) => {
        if (a.kind === "folder" && b.kind !== "folder") return -1;
        if (a.kind !== "folder" && b.kind === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, currentId, search]);

  const selected = selectedId ? byId.get(selectedId) : null;
  const currentFolder = currentId ? byId.get(currentId) : null;

  const openItem = (item: MarketingMediaDto) => {
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
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFileWithProgress(file, "marketing");
        await registerFile.mutateAsync({
          accountId,
          parentId: currentId,
          name: file.name,
          url: uploaded.publicUrl ?? uploaded.url,
          storageKey: uploaded.key,
          mimetype: uploaded.mimetype ?? file.type,
          sizeBytes: uploaded.size ?? file.size,
        });
      }
      toast.success(files.length === 1 ? "File uploaded" : `${files.length} files uploaded`);
      await refetch();
    } catch (err) {
      toastApiError(err, "Upload failed");
    }
  };

  const onCreateFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim() || !currentId) return;
    try {
      await createFolder.mutateAsync({
        accountId,
        parentId: currentId,
        name: name.trim(),
      });
      toast.success(`Created folder "${name.trim()}"`);
      await refetch();
    } catch (err) {
      toastApiError(err, "Could not create folder");
    }
  };

  const openRename = () => {
    if (!selected) return;
    setRenameValue(selected.name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!selected || !renameValue.trim()) return;
    try {
      await renameMedia.mutateAsync({
        id: selected.id,
        name: renameValue.trim(),
        accountId,
      });
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
      await deleteMedia.mutateAsync({ id: selected.id, accountId });
      toast.success("Deleted");
      setDeleteOpen(false);
      setSelectedId(null);
      await refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete");
    }
  };

  const canDeleteSelected = selected != null && selected.parentId != null;
  const canMoveSelected = selected != null && selected.parentId != null && canEdit;
  const canDownloadSelected =
    selected != null && selected.kind !== "folder";

  const handleDownload = async (item: MarketingMediaDto | null | undefined) => {
    if (!item || item.kind === "folder") return;
    setDownloading(true);
    try {
      await downloadMediaFile(item, accountId);
    } catch (err) {
      toastApiError(err, "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const folderTree = useMemo(
    () => items.filter((i) => i.kind === "folder"),
    [items],
  );

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
    return folderTree.filter((f) => !excluded.has(f.id) && f.id !== root?.id);
  }, [selected, folderTree, items, root?.id]);

  const openMove = () => {
    if (!selected || selected.parentId == null) return;
    const defaultParent =
      selected.parentId === root?.id ? (root?.id ?? null) : selected.parentId;
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
      await moveMedia.mutateAsync({ id: selected.id, accountId, parentId });
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
            Digital Media — {currentFolder?.name ?? "Vault"}
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

        {canCreate && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={onCreateFolder}>
            <Plus className="h-3 w-3" />
            New folder
          </Button>
        )}
        {canCreate && (
          <Button type="button" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3 w-3" />
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
        {selected && canEdit && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={openRename}>
            <Pencil className="h-3 w-3" />
            Rename
          </Button>
        )}
        {canMoveSelected && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={openMove}>
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
        <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-black/5 bg-[#f7f8fa] p-2 dark:border-white/5 dark:bg-[#1e2128] sm:block">
          <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          {folderTree.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => navigate(folder.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px]",
                currentId === folder.id
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {currentId === folder.id ? (
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-amber-500/80" />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#fafbfc] p-3 dark:bg-[#16181d]" onClick={() => setSelectedId(null)}>
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
              <p className="text-sm font-medium">This folder is empty</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Upload images, documents, or videos — files go to object storage under marketing/.
              </p>
              {canCreate && (
                <Button type="button" size="sm" className="mt-2 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Upload files
                </Button>
              )}
            </div>
          ) : viewMode === "icons" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {children.map((item) => (
                <button
                  key={item.id}
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
                <button
                  key={item.id}
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
              ))}
            </div>
          )}
        </main>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 bg-[#eef0f4] px-3 py-1.5 text-[10px] text-muted-foreground dark:border-white/5 dark:bg-[#1e2128]">
        <span>
          {children.length} item{children.length === 1 ? "" : "s"}
          {selected ? ` · Selected: ${selected.name}` : ""}
        </span>
        <span className="hidden sm:inline">Account #{accountId} · Double-click to open · Select a file to download</span>
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
                Root / account vault{root ? ` (${root.name})` : ""}
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
