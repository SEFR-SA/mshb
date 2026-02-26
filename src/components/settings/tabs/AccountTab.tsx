import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";

type EditField = "displayName" | "username" | "email" | "password" | null;

const AccountTab = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [editField, setEditField] = useState<EditField>(null);
  const [saving, setSaving] = useState(false);

  // Display name edit
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  // Username edit
  const [username, setUsername] = useState(profile?.username || "");
  // Email edit
  const [newEmail, setNewEmail] = useState("");
  // Password edit
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const p = profile as any;
  const initials = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  const toggleField = (field: EditField) => setEditField((prev) => (prev === field ? null : field));

  const saveDisplayName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() || null } as any).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("profile.saved") });
      await refreshProfile();
      setEditField(null);
    }
    setSaving(false);
  };

  const saveUsername = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: username.trim() || null } as any).eq("user_id", user.id);
    if (error) {
      const msg = error.message?.includes("profile_username_key") || error.message?.includes("unique constraint")
        ? t("auth.usernameTaken")
        : error.message;
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } else {
      toast({ title: t("profile.saved") });
      await refreshProfile();
      setEditField(null);
    }
    setSaving(false);
  };

  const saveEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.emailChangeNote") });
      setNewEmail("");
      setEditField(null);
    }
    setSaving(false);
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("auth.passwordMismatch"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: t("common.error"), description: t("auth.passwordMin"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditField(null);
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    toast({ title: t("common.error"), description: "Account deletion requires contacting support.", variant: "destructive" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.myAccount")}</h2>
        <p className="text-sm text-muted-foreground">Manage your account credentials and security.</p>
      </div>

      {/* Profile preview card */}
      <div className="rounded-xl overflow-hidden border border-border/50 bg-muted/20">
        {p?.banner_url ? (
          <img src={p.banner_url} alt="" className="h-20 w-full object-cover" />
        ) : (
          <div className="h-20 w-full bg-gradient-to-r from-primary/30 to-primary/10" />
        )}
        <div className="px-4 pb-4 -mt-8 flex items-end gap-3">
          <Avatar className="h-16 w-16 border-4 border-background shrink-0" alwaysPlayGif>
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="mb-1">
            <p className="font-bold">{profile?.display_name || profile?.username || "User"}</p>
            {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          </div>
        </div>
      </div>

      {/* Editable rows */}
      <div className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
        {/* Display Name */}
        <div className="bg-muted/10">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => { setDisplayName(profile?.display_name || ""); toggleField("displayName"); }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("profile.displayName")}</p>
              <p className="text-sm mt-0.5">{profile?.display_name || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs pointer-events-none">
                <Pencil className="h-3 w-3 me-1" /> {t("actions.edit")}
              </Button>
              {editField === "displayName" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {editField === "displayName" && (
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.editDisplayName")}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-background" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDisplayName} disabled={saving}>{t("actions.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>{t("actions.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Username */}
        <div className="bg-muted/10">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => { setUsername(profile?.username || ""); toggleField("username"); }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("profile.username")}</p>
              <p className="text-sm mt-0.5">{profile?.username ? `@${profile.username}` : "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs pointer-events-none">
                <Pencil className="h-3 w-3 me-1" /> {t("actions.edit")}
              </Button>
              {editField === "username" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {editField === "username" && (
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.editUsername")}</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-background" placeholder="username" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveUsername} disabled={saving}>{t("actions.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>{t("actions.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="bg-muted/10">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => { setNewEmail(""); toggleField("email"); }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("auth.email")}</p>
              <p className="text-sm mt-0.5">{user?.email ? user.email.replace(/(.{3}).*(@)/, "$1•••$2") : "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs pointer-events-none">
                <Pencil className="h-3 w-3 me-1" /> {t("actions.edit")}
              </Button>
              {editField === "email" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {editField === "email" && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-muted-foreground">{t("settings.emailChangeNote")}</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.editEmail")}</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background" placeholder="new@email.com" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEmail} disabled={saving || !newEmail.trim()}>{t("actions.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>{t("actions.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="bg-muted/10">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); toggleField("password"); }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("auth.password")}</p>
              <p className="text-sm mt-0.5">••••••••</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs pointer-events-none">
                <Pencil className="h-3 w-3 me-1" /> {t("settings.changePassword")}
              </Button>
              {editField === "password" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {editField === "password" && (
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.newPassword")}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.confirmNewPassword")}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-background" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={savePassword} disabled={saving || !newPassword}>{t("actions.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>{t("actions.cancel")}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-4">
        <h3 className="font-semibold text-destructive text-sm uppercase tracking-wide">{t("settings.dangerZone")}</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">{t("settings.deleteAccount")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.deleteAccount")}</AlertDialogTitle>
                <AlertDialogDescription>{t("settings.deleteAccountConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("settings.deleteAccount")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{t("settings.requestData")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Download a copy of all your data.</p>
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            onClick={() => toast({ title: "Data export", description: "Data export request sent. You'll receive an email shortly." })}
          >
            {t("settings.requestData")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountTab;
