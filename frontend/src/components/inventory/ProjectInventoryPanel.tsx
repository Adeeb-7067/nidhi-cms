import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isDeveloperRole } from "@/lib/user-roles";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  getInventorySummary,
  listInventoryResources,
  createInventoryResource,
  updateInventoryResource,
  listInventoryCredentials,
  createInventoryCredential,
  revealCredential,
  listInventoryEnvironments,
  createInventoryEnvironment,
  listInventoryDevices,
  listInventorySubscriptions,
  listInventoryBuilds,
  listInventoryActivities,
} from "@/lib/inventory-api";
import {
  FolderOpen,
  Key,
  Server,
  Smartphone,
  CreditCard,
  Package,
  Activity,
  Plus,
  Eye,
  EyeOff,
  Users,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { formatDistanceToNow } from "date-fns";
import { resolveApkDisplayName, formatApkReleaseSubtitle } from "@/lib/apk-audience";
import { cn } from "@/lib/utils";

export function ProjectInventoryPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const qc = useQueryClient();
  const isClient = user?.role === "client";
  const canManage = user?.role === "super_admin" || isDeveloperRole(user?.role);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inventory-summary", projectId] });
    qc.invalidateQueries({ queryKey: ["inventory-resources", projectId] });
    qc.invalidateQueries({ queryKey: ["inventory-activities", projectId] });
  };

  useEffect(() => {
    if (!socket || !projectId) return undefined;
    const onInventory = (payload: { projectId?: number }) => {
      if (payload.projectId === projectId) invalidate();
    };
    socket.on("inventory_update", onInventory);
    return () => {
      socket.off("inventory_update", onInventory);
    };
  }, [socket, projectId, qc]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["inventory-summary", projectId],
    queryFn: () => getInventorySummary(projectId),
  });

  return (
    <div className="space-y-6 min-w-0">
      {summaryLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Resources", value: summary?.resources ?? 0, icon: FolderOpen },
            { label: "Builds", value: summary?.builds ?? 0, icon: Package },
            { label: "Environments", value: summary?.environments ?? 0, icon: Server },
            { label: "Devices", value: summary?.devices ?? 0, icon: Smartphone },
            { label: "Subscriptions", value: summary?.subscriptions ?? 0, icon: CreditCard },
            ...(!isClient
              ? [{ label: "Credentials", value: summary?.credentials ?? 0, icon: Key }]
              : []),
          ].map((s) => (
            <Card key={s.label} className="bg-card min-w-0">
              <CardContent className="p-3 flex items-center gap-2">
                <s.icon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="resources" className="min-w-0">
        <TabsList className="h-auto min-h-8 w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="resources" className="text-xs">
            Resources
          </TabsTrigger>
          <TabsTrigger value="builds" className="text-xs">
            Builds
          </TabsTrigger>
          {!isClient && (
            <TabsTrigger value="credentials" className="text-xs">
              Credentials
            </TabsTrigger>
          )}
          <TabsTrigger value="environments" className="text-xs">
            Environments
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-xs">
            Devices
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-3">
          <ResourcesTab
            projectId={projectId}
            canManage={canManage || isClient}
            onChange={invalidate}
            isClient={isClient}
          />
        </TabsContent>
        <TabsContent value="builds" className="mt-3">
          <BuildsTab projectId={projectId} />
        </TabsContent>
        {!isClient && (
          <TabsContent value="credentials" className="mt-3">
            <CredentialsTab projectId={projectId} canManage={canManage} onChange={invalidate} />
          </TabsContent>
        )}
        <TabsContent value="environments" className="mt-3">
          <EnvironmentsTab projectId={projectId} canManage={canManage} onChange={invalidate} />
        </TabsContent>
        <TabsContent value="devices" className="mt-3">
          <DevicesTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-3">
          <SubscriptionsTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="activity" className="mt-3">
          <ActivityTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function resourceVisibilityLabel(visibility: string) {
  if (visibility === "client_visible") return "Team + Client";
  if (visibility === "team_only") return "Team only";
  return visibility;
}

function ResourcesTab({
  projectId,
  canManage,
  onChange,
  isClient,
}: {
  projectId: number;
  canManage: boolean;
  onChange: () => void;
  isClient: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [shareWithClient, setShareWithClient] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [sharingAll, setSharingAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-resources", projectId],
    queryFn: () => listInventoryResources(projectId),
  });

  const reset = () => {
    setName("");
    setUrl("");
    setFileUrl("");
    setShareWithClient(true);
  };

  const handleAdd = async () => {
    try {
      await createInventoryResource(projectId, {
        name: name || "Untitled",
        type: fileUrl ? "file" : url ? "link" : "document",
        fileUrl: fileUrl || undefined,
        url: url || undefined,
        visibility: isClient || shareWithClient ? "client_visible" : "team_only",
      });
      toast.success("Resource added");
      setAddOpen(false);
      reset();
      onChange();
    } catch (error) {
      toastApiError(error, "Failed to add resource");
    }
  };

  const toggleVisibility = async (resource: { id: number; visibility: string; name: string }) => {
    const next = resource.visibility === "client_visible" ? "team_only" : "client_visible";
    setUpdatingId(resource.id);
    try {
      await updateInventoryResource(projectId, resource.id, { visibility: next });
      toast.success(
        next === "client_visible"
          ? `"${resource.name}" is visible to team and client`
          : `"${resource.name}" is team-only (hidden from client)`,
      );
      onChange();
    } catch (error) {
      toastApiError(error, "Failed to update visibility");
    } finally {
      setUpdatingId(null);
    }
  };

  const teamOnlyCount = (data?.resources ?? []).filter(
    (r: { visibility: string }) => r.visibility === "team_only",
  ).length;

  const shareAllWithClient = async () => {
    const teamOnly = (data?.resources ?? []).filter((r: { visibility: string }) => r.visibility === "team_only");
    if (!teamOnly.length) return;
    setSharingAll(true);
    try {
      await Promise.all(
        teamOnly.map((r: { id: number }) =>
          updateInventoryResource(projectId, r.id, { visibility: "client_visible" }),
        ),
      );
      toast.success(`${teamOnly.length} resource${teamOnly.length !== 1 ? "s" : ""} shared with client`);
      onChange();
    } catch (error) {
      toastApiError(error, "Failed to share resources");
    } finally {
      setSharingAll(false);
    }
  };

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="p-3 flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm shrink-0">Resource library</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {canManage && !isClient && teamOnlyCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={sharingAll}
                onClick={shareAllWithClient}
              >
                <Users className="h-3 w-3 mr-1" />
                {sharingAll ? "Sharing…" : `Share all with client (${teamOnlyCount})`}
              </Button>
            )}
            {canManage && (
              <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => setAddOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : !data?.resources?.length ? (
            <p className="text-xs text-muted-foreground text-center py-8">No resources yet</p>
          ) : (
            <div className="space-y-2">
              {data.resources.map((r: any) => {
                const isImage = r.mimeType?.startsWith("image/") && r.fileUrl;
                const fromDiscussion =
                  r.category === "discussion" || r.tags?.includes?.("discussion");
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-2 border rounded-md p-2.5 hover:bg-muted/30 min-w-0"
                  >
                    {isImage && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={r.fileUrl}
                          alt={r.name}
                          className="h-12 w-12 rounded-md border object-cover bg-muted"
                          loading="lazy"
                        />
                      </a>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.type}
                        {fromDiscussion ? " · discussion" : ""} · {r.uploaderName} · v{r.version}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {fromDiscussion && (
                        <Badge variant="secondary" className="text-[9px]">
                          chat
                        </Badge>
                      )}
                      {canManage && !isClient ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-6 text-[9px] px-1.5 gap-1",
                            r.visibility === "client_visible"
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                          disabled={updatingId === r.id}
                          onClick={() => toggleVisibility(r)}
                          title={
                            r.visibility === "client_visible"
                              ? "Team + Client — click to hide from client portal"
                              : "Team only — click to share with client too"
                          }
                        >
                          {r.visibility === "client_visible" ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {resourceVisibilityLabel(r.visibility)}
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px]",
                            r.visibility === "client_visible" && "border-emerald-500/40 text-emerald-600",
                          )}
                        >
                          {resourceVisibilityLabel(r.visibility)}
                        </Badge>
                      )}
                      {(r.fileUrl || r.url) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={r.fileUrl || r.url} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add resource</DialogTitle>
            <DialogDescription className="text-xs">
              Upload a file or link to design assets, docs, repos, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="e.g. Figma designs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File upload (optional)</Label>
              <FileUploader category="inventory" label="Drag & drop or click" onUploadComplete={setFileUrl} />
            </div>
            {!isClient && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={shareWithClient}
                  onCheckedChange={(v) => setShareWithClient(v === true)}
                />
                <span className="text-xs text-muted-foreground">
                  Visible to team and client (recommended for deliverables)
                </span>
              </label>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Save resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CredentialsTab({
  projectId,
  canManage,
  onChange,
}: {
  projectId: number;
  canManage: boolean;
  onChange: () => void;
}) {
  const [revealId, setRevealId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ label: "", type: "api_key", value: "", username: "" });

  const { data: creds, isLoading } = useQuery({
    queryKey: ["inventory-credentials", projectId],
    queryFn: () => listInventoryCredentials(projectId),
  });

  const handleReveal = async () => {
    if (!revealId) return;
    try {
      const res = await revealCredential(projectId, revealId, password);
      setRevealed(res);
      setPassword("");
    } catch {
      toast.error("Password incorrect or access denied");
    }
  };

  const handleCreate = async () => {
    try {
      await createInventoryCredential(projectId, form);
      toast.success("Credential saved (encrypted)");
      setAddOpen(false);
      setForm({ label: "", type: "api_key", value: "", username: "" });
      onChange();
    } catch (error) {
      toastApiError(error, "Failed to save credential");
    }
  };

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="p-3 flex-row justify-between items-center gap-2">
          <CardTitle className="text-sm flex items-center gap-1 min-w-0">
            <Key className="h-4 w-4 shrink-0" /> Secure vault
          </CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            creds?.map((c: any) => (
              <div
                key={c.id}
                className="flex justify-between items-center gap-2 border rounded p-2 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{c.type}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => setRevealId(c.id)}
                >
                  <Eye className="h-3 w-3 mr-1" /> Reveal
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={revealId !== null}
        onOpenChange={() => {
          setRevealId(null);
          setRevealed(null);
          setPassword("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Confirm password to reveal</DialogTitle>
          </DialogHeader>
          {!revealed ? (
            <div className="space-y-3">
              <PasswordInput
                placeholder="Your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9"
              />
              <DialogFooter>
                <Button onClick={handleReveal} size="sm">
                  Reveal credential
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="font-mono text-xs bg-muted p-3 rounded break-all max-h-40 overflow-y-auto">
                {revealed.value}
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(revealed.value);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add credential</DialogTitle>
            <DialogDescription className="text-xs">
              Stored encrypted. Reveal requires your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API key</SelectItem>
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="firebase">Firebase</SelectItem>
                  <SelectItem value="cloud">Cloud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username (optional)</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Secret value</Label>
              <PasswordInput
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate}>
              Encrypt & save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BuildsTab({ projectId }: { projectId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory-builds", projectId],
    queryFn: () => listInventoryBuilds(projectId),
  });
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">APK / Build inventory</CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          data?.builds?.map((b: any, i: number) => (
            <div
              key={b.id}
              className={`flex justify-between gap-2 border rounded p-2 min-w-0 ${
                i === 0 ? "border-primary/50 bg-primary/5" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" title={resolveApkDisplayName(b)}>
                  {resolveApkDisplayName(b)}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {formatApkReleaseSubtitle(b)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 truncate">
                  {b.uploaderName} ·{" "}
                  {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <a href={b.fileUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EnvironmentsTab({
  projectId,
  canManage,
  onChange,
}: {
  projectId: number;
  canManage: boolean;
  onChange: () => void;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [envType, setEnvType] = useState("development");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-envs", projectId],
    queryFn: () => listInventoryEnvironments(projectId),
  });

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Environment name is required");
      return;
    }
    try {
      await createInventoryEnvironment(projectId, {
        envType,
        name: name.trim(),
        url: url.trim() || undefined,
      });
      toast.success("Environment added");
      setAddOpen(false);
      setName("");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["inventory-envs", projectId] });
      onChange();
    } catch (error) {
      toastApiError(error, "Failed to add environment");
    }
  };

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="p-3 flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <CardTitle className="text-sm">Environments</CardTitle>
          {canManage && (
            <Button size="sm" className="h-7 text-xs w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add environment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : (
            data?.map((e: any) => (
              <div key={e.id} className="border rounded p-2 flex justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium capitalize truncate">
                    {e.envType} — {e.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{e.url || "No URL"}</p>
                </div>
                <Badge className="text-[9px] capitalize shrink-0">{e.healthStatus}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add environment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={envType} onValueChange={setEnvType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Staging API"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL (optional)</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 text-xs"
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DevicesTab({ projectId }: { projectId: number }) {
  const { data } = useQuery({
    queryKey: ["inventory-devices", projectId],
    queryFn: () => listInventoryDevices(projectId),
  });
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Devices</CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {data?.length ? (
          data.map((d: any) => (
            <div key={d.id} className="border rounded p-2 text-xs min-w-0">
              <p className="font-medium truncate">{d.deviceName}</p>
              <p className="text-muted-foreground truncate">
                {d.brand} {d.model} · {d.status} · {d.assignedName || "Unassigned"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No devices tracked</p>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionsTab({ projectId }: { projectId: number }) {
  const { data } = useQuery({
    queryKey: ["inventory-subs", projectId],
    queryFn: () => listInventorySubscriptions(projectId),
  });
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Subscriptions & licenses</CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {data?.map((s: any) => (
          <div
            key={s.id}
            className="border rounded p-2 flex justify-between items-center gap-2 min-w-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{s.name}</p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">
                {s.type} · expires {new Date(s.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <Badge
              variant={s.daysUntilExpiry <= 7 ? "destructive" : "secondary"}
              className="text-[9px] shrink-0"
            >
              {s.daysUntilExpiry}d left
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityTab({ projectId }: { projectId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory-activities", projectId],
    queryFn: () => listInventoryActivities(projectId),
  });
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3">
        <CardTitle className="text-sm flex items-center gap-1">
          <Activity className="h-4 w-4" /> Activity timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          data?.activities?.map((a: any) => (
            <div key={a.id} className="border-l-2 border-primary/40 pl-3 py-1 min-w-0">
              <p className="text-xs break-words">
                <span className="font-medium">{a.actorName}</span> ·{" "}
                {a.action.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {a.entityName} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
