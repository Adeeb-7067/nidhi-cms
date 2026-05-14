import React, { useState } from "react";
import { 
  useGetMe, 
  useUpdateMyProfile, 
  useChangeMyPassword,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Key, 
  Check, 
  Camera,
  Loader2,
  Calendar,
  Clock,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } = useUpdateMyProfile();
  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangeMyPassword();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    name: "",
    designation: "",
    avatarUrl: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordError, setPasswordError] = useState("");

  // Initialize form when user data is loaded
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        designation: user.designation || "",
        avatarUrl: user.avatarUrl || ""
      });
    }
  }, [user]);

  if (isLoadingUser || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        data: {
          name: profileForm.name,
          designation: profileForm.designation,
          avatarUrl: profileForm.avatarUrl || undefined
        }
      });
      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "There was an error updating your profile.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError("New password cannot be the same as current password");
      return;
    }

    try {
      await changePassword({
        data: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }
      });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      toast({
        title: "Change password failed",
        description: error?.message || "There was an error changing your password.",
        variant: "destructive",
      });
    }
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    developer: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    client: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and security</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column - User Info */}
        <div className="md:col-span-4 space-y-6">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <CardContent className="relative pt-0 px-6 pb-6">
              <div className="absolute -top-12 left-6">
                <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/10">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="mt-14 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", roleColors[user.role] || "bg-muted text-muted-foreground")}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{user.designation || "No designation set"}</p>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  {user.employeeId && (
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">ID:</span>
                      <span className="font-mono">{user.employeeId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{user.designation || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Member since</span>
                    </div>
                    <span className="font-medium">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last Login</span>
                    </div>
                    <span className="font-medium">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, HH:mm") : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Forms */}
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-base font-semibold">Account Information</CardTitle>
              <CardDescription>Update your personal details and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={profileForm.name} 
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input 
                      id="designation" 
                      value={profileForm.designation} 
                      onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                      placeholder="e.g. Senior Developer"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        id="avatarUrl" 
                        value={profileForm.avatarUrl} 
                        onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                        className="h-8 text-sm pl-8"
                      />
                      <Camera className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isUpdatingProfile} className="h-8">
                    {isUpdatingProfile && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4 px-6">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Change Password</CardTitle>
              </div>
              <CardDescription>Ensure your account is using a long, random password to stay secure</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <Alert variant="destructive" className="py-2 px-3">
                    <AlertDescription className="text-xs">{passwordError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={passwordForm.newPassword} 
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={passwordForm.confirmPassword} 
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isChangingPassword} className="h-8" variant="secondary">
                    {isChangingPassword && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
