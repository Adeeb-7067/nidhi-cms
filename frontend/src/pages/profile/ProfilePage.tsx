import React, { useState } from "react";
import { Link } from "wouter";
import { getGetMeQueryKey } from "@/api";
import { patchSelfProfile } from "@/api/self-profile";
import { teamEmployeeQueryKey, useTeamEmployeeProfile } from "@/api/team-employees";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { EmployeeSelfProfileForm } from "@/components/profile/EmployeeSelfProfileForm";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { ProfilePageSkeleton } from "@/components/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "@/components/ui/file-uploader";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Mail,
  Shield,
  Key,
  Check,
  Loader2,
  Calendar,
  Clock,
  Briefcase,
  Settings,
  Bell,
  Phone,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useUserWithPresence } from "@/contexts/PresenceContext";
import { AvatarWithPresence } from "@/components/presence/AvatarWithPresence";
import { UserPresenceMeta } from "@/components/presence/UserPresenceMeta";
import { formatLastLogin } from "@/lib/presence";
import {
  buildSelfProfilePayload,
  usesEmployeeSelfProfile,
} from "@/modules/hrm/self-profile-shared";

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
  developer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  freelancer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  qa: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  tester: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  client: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  hr: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
  manager: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
};

function formatProfileDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = parseISO(value);
  if (!isValid(parsed)) return "—";
  return format(parsed, "MMM d, yyyy");
}

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profileSyncVersion, setProfileSyncVersion] = useState(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isEmployeeProfile = usesEmployeeSelfProfile(user);
  const {
    data: fullEmployeeRecord,
    isFetching: isFetchingEmployeeRecord,
    isError: employeeRecordError,
  } = useTeamEmployeeProfile(user?.id, isEmployeeProfile);

  const employeeRecordReady =
    !isEmployeeProfile || (fullEmployeeRecord != null && !isFetchingEmployeeRecord);

  const employeeProfileSource = fullEmployeeRecord as Record<string, unknown> | undefined;

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    designation: "",
    avatarUrl: "",
  });

  React.useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        designation: user.designation || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const userWithPresence = useUserWithPresence(user);
  const displayAvatar = user?.avatarUrl || undefined;
  const displayName = user?.name || "User";
  const phoneNumber = user?.phoneNumber || null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await patchSelfProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        designation: profileForm.designation.trim() || undefined,
        avatarUrl: profileForm.avatarUrl.trim() || undefined,
      });
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: getApiErrorMessage(error, "Could not update your profile."),
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStaffProfileSave = async (
    payload: ReturnType<typeof buildSelfProfilePayload>,
  ) => {
    setIsSavingProfile(true);
    try {
      const updated = await patchSelfProfile(payload);
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      if (user?.id) {
        queryClient.setQueryData(teamEmployeeQueryKey(user.id), updated);
      }
      setProfileSyncVersion((v) => v + 1);
      toast({
        title: "Profile updated",
        description: "Your employee profile has been saved.",
      });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: getApiErrorMessage(error, "Could not update your profile."),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isAuthLoading || !user) {
    return (
      <PageShell hideHeader>
        <ProfilePageSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell hideHeader>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEmployeeProfile
              ? "Keep your personal, contact, and payroll details up to date"
              : "Update your photo, details, and password"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4 overflow-hidden border-border/80">
          <div className="h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
          <CardContent className="relative px-6 pb-6 pt-0">
            <div className="-mt-14 mb-4 flex justify-center sm:justify-start">
              <AvatarWithPresence
                name={displayName}
                avatarUrl={displayAvatar}
                presenceStatus={userWithPresence?.presenceStatus ?? "online"}
                avatarClassName="h-28 w-28 border-4 border-background ring-2 ring-primary/20 shadow-lg"
              />
            </div>

            <div className="space-y-4 text-center sm:text-left">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold uppercase",
                      ROLE_STYLES[user.role] ?? "",
                    )}
                  >
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.designation || "No designation"}
                </p>
              </div>

              <Separator />

              <ul className="space-y-3 text-sm">
                {user.employeeId && (
                  <li className="flex items-center gap-3">
                    <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Employee ID</span>
                    <span className="ml-auto font-mono text-xs">{user.employeeId}</span>
                  </li>
                )}
                <li className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{user.email}</span>
                </li>
                {phoneNumber ? (
                  <li className="flex items-center gap-3 min-w-0">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{phoneNumber}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.designation || "—"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  >
                    {user.status === "active" ? "Active" : user.status}
                  </Badge>
                </li>
              </ul>

              <Separator />

              {userWithPresence && (
                <UserPresenceMeta
                  presenceStatus={userWithPresence.presenceStatus}
                  lastSeenAt={userWithPresence.lastSeenAt}
                  lastLoginAt={userWithPresence.lastLoginAt}
                  compact
                />
              )}

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Joined</span>
                  </div>
                  <p className="font-medium">{formatProfileDate(user.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Last login</span>
                  </div>
                  <p className="font-medium">{formatLastLogin(user.lastLoginAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-6">
          {isEmployeeProfile ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Employee profile</CardTitle>
                <CardDescription>
                  Same personal fields as your HR record — department, salary amounts, and leave
                  settings are managed by admin/HR.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!employeeRecordReady ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <p className="text-center text-sm text-muted-foreground">Loading your employee profile…</p>
                  </div>
                ) : employeeRecordError ? (
                  <p className="py-6 text-center text-sm text-destructive">
                    Could not load your full profile. Refresh the page or try again later.
                  </p>
                ) : employeeProfileSource ? (
                  <EmployeeSelfProfileForm
                    user={employeeProfileSource}
                    syncVersion={profileSyncVersion}
                    saving={isSavingProfile}
                    onSave={handleStaffProfileSave}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Account information</CardTitle>
                <CardDescription>Changes apply across the workspace after you save</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={profileForm.designation}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, designation: e.target.value })
                        }
                        placeholder="e.g. Senior Developer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Profile photo</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload a photo — preview updates on the left before you save.
                    </p>
                    <FileUploader
                      category="avatars"
                      accept="image/*"
                      label="Upload profile photo"
                      value={profileForm.avatarUrl}
                      maxSizeMB={5}
                      onUploadComplete={(url) =>
                        setProfileForm({ ...profileForm, avatarUrl: url })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setProfileForm({
                          name: user.name || "",
                          email: user.email || "",
                          designation: user.designation || "",
                          avatarUrl: user.avatarUrl || "",
                        })
                      }
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Change password</CardTitle>
              </div>
              <CardDescription>Use at least 8 characters with mixed case and numbers</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordCard userEmail={user.email} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
