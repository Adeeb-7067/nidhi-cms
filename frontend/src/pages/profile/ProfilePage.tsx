import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetMe, useUpdateMyProfile, getGetMeQueryKey } from "@/api";
import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { AppLoadingScreen } from "@/components/loading";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
  developer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  tester: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  client: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    name: "",
    designation: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        designation: user.designation || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const displayAvatar = profileForm.avatarUrl || user?.avatarUrl || undefined;
  const displayName = profileForm.name || user?.name || "User";

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        data: {
          name: profileForm.name.trim(),
          designation: profileForm.designation.trim() || undefined,
          avatarUrl: profileForm.avatarUrl.trim() || undefined,
        },
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: getApiErrorMessage(error, "Could not update your profile."),
        variant: "destructive",
      });
    }
  };

  if (isLoadingUser || !user) {
    return (
      <AppLoadingScreen
        variant="embedded"
        message="Loading profile"
        submessage="Fetching your account details…"
      />
    );
  }

  return (
    <PageShell hideHeader>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update your photo, details, and password
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
              <Avatar className="h-28 w-28 border-4 border-background ring-2 ring-primary/20 shadow-lg">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
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
                  {profileForm.designation || user.designation || "No designation"}
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
                <li className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {profileForm.designation || user.designation || "—"}
                  </span>
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

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Joined</span>
                  </div>
                  <p className="font-medium">{format(new Date(user.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Last login</span>
                  </div>
                  <p className="font-medium">
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), "MMM d, HH:mm")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-6">
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
                        designation: user.designation || "",
                        avatarUrl: user.avatarUrl || "",
                      })
                    }
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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


