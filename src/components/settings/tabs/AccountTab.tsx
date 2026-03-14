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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ChevronDown, ChevronUp, Pencil, Loader2, Download } from "lucide-react";
import StyledDisplayName from "@/components/StyledDisplayName";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStreamerMode } from "@/contexts/StreamerModeContext";

type EditField = "displayName" | "username" | "email" | "password" | null;

const AccountTab = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isStreamerMode } = useStreamerMode();
  const [editField, setEditField] = useState<EditField>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");

  // Display name edit
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  // Username edit
  const [username, setUsername] = useState(profile?.username || "");
  const [usernamePassword, setUsernamePassword] = useState("");
  // Email edit
  const [newEmail, setNewEmail] = useState("");
  // Password edit
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const p_profile = profile as any;
  const usernameChangedAt = p_profile?.username_changed_at ? new Date(p_profile.username_changed_at) : null;
  const cooldownEnd = usernameChangedAt ? new Date(usernameChangedAt.getTime() + 6 * 30 * 24 * 60 * 60 * 1000) : null;
  const isUsernameCoolingDown = cooldownEnd ? cooldownEnd > new Date() : false;

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
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      toast({ title: t("common.error"), description: t("auth.usernameTooShort", "Username must be at least 3 characters."), variant: "destructive" });
      return;
    }
    if (!usernamePassword) {
      toast({ title: t("common.error"), description: t("settings.passwordRequired", "Please enter your password to confirm."), variant: "destructive" });
      return;
    }
    setSaving(true);

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: usernamePassword,
    });
    if (signInError) {
      toast({ title: t("common.error"), description: t("settings.incorrectPassword", "Incorrect password."), variant: "destructive" });
      setSaving(false);
      return;
    }

    // Call RPC
    const { data, error } = await supabase.rpc("change_username", {
      p_new_username: trimmed,
      p_password: usernamePassword,
    } as any);

    const result = data as any;
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else if (result?.error === "cooldown") {
      toast({ title: t("common.error"), description: t("settings.usernameCooldown", "You can only change your username once every 6 months. Next change available: ") + new Date(result.next_change_at).toLocaleDateString(), variant: "destructive" });
    } else if (result?.error === "taken") {
      toast({ title: t("common.error"), description: t("auth.usernameTaken"), variant: "destructive" });
    } else if (result?.error === "too_short") {
      toast({ title: t("common.error"), description: t("auth.usernameTooShort", "Username must be at least 3 characters."), variant: "destructive" });
    } else if (result?.success) {
      toast({ title: t("profile.saved") });
      setUsernamePassword("");
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
      setNewPassword("");
      setConfirmPassword("");
      setEditField(null);
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || !deleteConfirmPassword) return;

    // Re-authenticate to confirm identity
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: deleteConfirmPassword,
    });
    if (signInError) {
      toast({ title: t("common.error"), description: "Incorrect password.", variant: "destructive" });
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || res.data?.error) {
        toast({ title: t("common.error"), description: res.data?.error || "Deletion failed.", variant: "destructive" });
        setDeleting(false);
        return;
      }

      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      await signOut();
      navigate("/auth");
    } catch {
      toast({ title: t("common.error"), description: "Something went wrong.", variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    toast({ title: "Preparing your data…", description: "Your data will be available to you shortly." });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("export-user-data", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || res.data?.error) {
        toast({ title: t("common.error"), description: res.data?.error || "Export failed.", variant: "destructive" });
        setExporting(false);
        return;
      }

      // Trigger download
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mshb-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Download started", description: "Your data export has been downloaded." });
    } catch {
      toast({ title: t("common.error"), description: "Something went wrong.", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.myAccount")}</h2>
        <p className="text-sm text-muted-foreground">Manage your account credentials and security.</p>
      </div>

      {/* Profile preview card */}
      <div className="rounded-xl overflow-hidden border border-border/50 bg-muted/20">
        <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={p?.is_pro}>
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
              <StyledDisplayName
                displayName={profile?.display_name || profile?.username || "User"}
                fontStyle={p?.name_font}
                effect={p?.name_effect}
                gradientStart={p?.name_gradient_start}
                gradientEnd={p?.name_gradient_end}
                className="font-bold"
              />
              {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            </div>
          </div>
        </ProfileEffectWrapper>
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
              <p className="text-sm mt-0.5">{isStreamerMode ? "••••••@••••••" : (user?.email ? user.email.replace(/(.{3}).*(@)/, "$1•••$2") : "—")}</p>
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
            onClick={() => { setNewPassword(""); setConfirmPassword(""); toggleField("password"); }}
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
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <div className="shrink-0">
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="destructive" size="sm">{t("settings.deleteAccount")}</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>{t("settings.deleteAccount")}</DrawerTitle>
                    <DrawerDescription>
                      {t("settings.deleteAccountConfirm")} This will permanently remove your profile, messages, servers you own, friendships, and all associated data. Enter your password to confirm.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-1.5 px-5">
                    <Label className="text-xs text-muted-foreground">Current password</Label>
                    <Input
                      type="password"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="bg-background"
                    />
                  </div>
                  <DrawerFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleting || !deleteConfirmPassword}
                    >
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin me-1" /> Deleting…</> : t("settings.deleteAccount")}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline" onClick={() => setDeleteConfirmPassword("")}>{t("actions.cancel")}</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">{t("settings.deleteAccount")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("settings.deleteAccount")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("settings.deleteAccountConfirm")} This will permanently remove your profile, messages, servers you own, friendships, and all associated data. Enter your password to confirm.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-1.5 py-2">
                    <Label className="text-xs text-muted-foreground">Current password</Label>
                    <Input
                      type="password"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="bg-background"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmPassword("")}>{t("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting || !deleteConfirmPassword}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin me-1" /> Deleting…</> : t("settings.deleteAccount")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">{t("settings.requestData")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Download a copy of all your data (GDPR).</p>
          </div>
          <div className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? <><Loader2 className="h-4 w-4 animate-spin me-1" /> Exporting…</> : <><Download className="h-4 w-4 me-1" /> {t("settings.requestData")}</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTab;
