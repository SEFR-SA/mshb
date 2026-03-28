import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useBlockUser } from "@/hooks/useBlockUser";
import { useInviteToServer } from "@/contexts/InviteToServerContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Users,
  Server,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Ban,
  Flag,
  Pencil,
  Gamepad2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import SetStatusModal from "@/components/settings/SetStatusModal";
import ReportUserDialog from "@/components/chat/ReportUserDialog";

type Profile = Tables<"profiles">;

interface MutualFriend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  name_font?: string | null;
  name_effect?: string | null;
  name_gradient_start?: string | null;
  name_gradient_end?: string | null;
}

interface MutualServer {
  id: string;
  name: string;
  icon_url: string | null;
}

// ─── Small reusable section wrapper ──────────────────────────────────────────

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
      {label}
    </h4>
    {children}
  </div>
);

// ─── Mutual friend row ────────────────────────────────────────────────────────

const FriendRow = ({
  profile,
  onOpen,
}: {
  profile: MutualFriend;
  onOpen: (userId: string) => void;
}) => (
  <button
    onClick={() => onOpen(profile.user_id)}
    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-start"
  >
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={profile.avatar_url || ""} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs">
        {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <StyledDisplayName displayName={profile.display_name || profile.username || "User"} fontStyle={profile.name_font} effect={profile.name_effect} gradientStart={profile.name_gradient_start} gradientEnd={profile.name_gradient_end} className="text-sm font-medium text-foreground truncate" />
      {profile.username && (
        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
      )}
    </div>
  </button>
);

// ─── Mutual server row ────────────────────────────────────────────────────────

const ServerRow = ({ server }: { server: MutualServer }) => (
  <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
    <div className="h-8 w-8 rounded-lg shrink-0 bg-white/5 flex items-center justify-center overflow-hidden">
      {server.icon_url ? (
        <img
          src={server.icon_url}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span className="text-xs font-bold text-muted-foreground">
          {server.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-foreground truncate">{server.name}</p>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground/25 mb-2" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FullProfileModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profileUserId, openProfile, closeProfile } = useUserProfile();
  const { blockUser, unblockUser, isBlocked } = useBlockUser();
  const { openInviteToServer } = useInviteToServer();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [profile, setProfile]               = useState<Profile | null>(null);
  const [mutualFriends, setMutualFriends]   = useState<MutualFriend[]>([]);
  const [mutualServers, setMutualServers]   = useState<MutualServer[]>([]);
  const [note, setNote]                     = useState("");
  const [activeTab, setActiveTab]           = useState<"activity" | "friends" | "servers">("activity");
  const [loading, setLoading]               = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [friendshipId, setFriendshipId]     = useState<string | null>(null);
  const [friendStatus, setFriendStatus]     = useState<string | null>(null);
  const [reportOpen, setReportOpen]         = useState(false);

  const isOpen = !!profileUserId;
  const isSelf = profileUserId === user?.id;

  // ── Profile fetch ────────────────────────────────────────────────────────

  const fetchProfile = useCallback(() => {
    if (!profileUserId) { setProfile(null); return; }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", profileUserId)
      .maybeSingle()
      .then(({ data }) => { setProfile(data); setLoading(false); });
  }, [profileUserId]);

  // ── Mutual friends ───────────────────────────────────────────────────────

  const fetchMutualFriends = useCallback(async () => {
    if (!user || !profileUserId || isSelf) return;
    const [{ data: myF }, { data: theirF }] = await Promise.all([
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted"),
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .eq("status", "accepted"),
    ]);

    const myIds = new Set(
      (myF ?? []).map((f: any) => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    );
    const theirIds = new Set(
      (theirF ?? []).map((f: any) => f.requester_id === profileUserId ? f.addressee_id : f.requester_id)
    );
    const mutualIds = [...myIds].filter(id => theirIds.has(id));

    if (!mutualIds.length) { setMutualFriends([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name,username,avatar_url,name_font,name_effect,name_gradient_start,name_gradient_end")
      .in("user_id", mutualIds);

    setMutualFriends((profiles ?? []) as MutualFriend[]);
  }, [user, profileUserId, isSelf]);

  // ── Mutual servers ───────────────────────────────────────────────────────

  const fetchMutualServers = useCallback(async () => {
    if (!user || !profileUserId || isSelf) return;
    const [{ data: myM }, { data: theirM }] = await Promise.all([
      supabase.from("server_members").select("server_id").eq("user_id", user.id),
      supabase.from("server_members").select("server_id").eq("user_id", profileUserId),
    ]);

    const theirServerIds = new Set((theirM ?? []).map((m: any) => m.server_id));
    const mutualIds = (myM ?? []).map((m: any) => m.server_id).filter((id: string) => theirServerIds.has(id));

    if (!mutualIds.length) { setMutualServers([]); return; }

    const { data: servers } = await supabase
      .from("servers")
      .select("id,name,icon_url")
      .in("id", mutualIds);

    setMutualServers((servers ?? []) as MutualServer[]);
  }, [user, profileUserId, isSelf]);

  // ── Notes ────────────────────────────────────────────────────────────────

  const fetchNote = useCallback(async () => {
    if (!user || !profileUserId || isSelf) return;
    const { data } = await supabase
      .from("profile_notes" as any)
      .select("note")
      .eq("author_id", user.id)
      .eq("target_id", profileUserId)
      .maybeSingle();
    setNote((data as any)?.note ?? "");
  }, [user, profileUserId, isSelf]);

  const saveNote = async () => {
    if (!user || !profileUserId || isSelf) return;
    await supabase.from("profile_notes" as any).upsert({
      author_id: user.id,
      target_id: profileUserId,
      note,
      updated_at: new Date().toISOString(),
    });
  };

  // ── Friendship status ──────────────────────────────────────────────────

  const fetchFriendship = useCallback(async () => {
    if (!user || !profileUserId || isSelf) {
      setFriendshipId(null);
      setFriendStatus(null);
      return;
    }
    const { data } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (data) {
      setFriendshipId(data.id);
      setFriendStatus(data.status);
    } else {
      setFriendshipId(null);
      setFriendStatus(null);
    }
  }, [user, profileUserId, isSelf]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProfile();
    setMutualFriends([]);
    setMutualServers([]);
    setNote("");
    setActiveTab("activity");
    setFriendshipId(null);
    setFriendStatus(null);
    setReportOpen(false);
  }, [fetchProfile]);

  useEffect(() => {
    if (!profileUserId) return;
    fetchMutualFriends();
    fetchMutualServers();
    fetchNote();
    fetchFriendship();
  }, [fetchMutualFriends, fetchMutualServers, fetchNote, fetchFriendship]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleMessage = async () => {
    if (!user || !profileUserId || isSelf) return;
    const [u1, u2] = [user.id, profileUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (newThread) navigate(`/chat/${newThread.id}`);
    }
    closeProfile();
  };

  const handleEditProfile = () => {
    closeProfile();
    navigate("/settings");
  };

  const handleAddFriend = async () => {
    if (!user || !profileUserId) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: profileUserId });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("friends.requestSent") });
      setFriendStatus("pending");
      await supabase.from("notifications" as any).insert({
        user_id: profileUserId, actor_id: user.id, type: "friend_request",
      } as any);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriendshipId(null);
    setFriendStatus(null);
    toast({ title: t("friends.removed", "Friend removed") });
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const p = profile as any;
  const effectiveStatusText =
    p?.status_until && new Date(p.status_until) < new Date() ? null : p?.status_text ?? null;
  const initial = (p?.display_name || p?.username || "?").charAt(0).toUpperCase();
  const currentStatus = (p?.status || "online") as UserStatus;

  const profileThemeVars = {
    "--profile-primary": p?.profile_primary_color ?? "hsl(var(--primary))",
    "--profile-accent":  p?.profile_accent_color  ?? "hsl(var(--primary)/0.6)",
  } as React.CSSProperties;

  // ── Friendship button ─────────────────────────────────────────────────────

  const renderFriendshipButton = () => {
    if (friendStatus === "accepted") {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 h-8 text-xs bg-white/10 hover:bg-white/20 border-0"
          onClick={handleRemoveFriend}
        >
          <UserMinus className="h-3.5 w-3.5" />
          {t("friends.remove")}
        </Button>
      );
    }
    if (friendStatus === "pending") {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 h-8 text-xs bg-white/10 border-0 opacity-60"
          disabled
        >
          <UserPlus className="h-3.5 w-3.5" />
          {t("friends.pending")}
        </Button>
      );
    }
    return (
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5 h-8 text-xs bg-white/10 hover:bg-white/20 border-0"
        onClick={handleAddFriend}
      >
        <UserPlus className="h-3.5 w-3.5" />
        {t("friends.addFriend")}
      </Button>
    );
  };

  // ── Profile content ────────────────────────────────────────────────────────

  const profileContent = (
    <div
      className="relative overflow-hidden h-full flex flex-col"
      style={{ ...profileThemeVars, borderColor: "var(--profile-accent)" }}
    >
      {/* L1: Full-bleed gradient */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, var(--profile-primary), var(--profile-accent))" }} />
      {/* L2: Dark wash */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={p?.is_pro} className="relative z-[2] flex flex-col flex-1 min-h-0">
        {/* ── Banner ──────────────────────────────────────────────────── */}
        <div className="relative h-[120px] w-full shrink-0 overflow-hidden">
          {p?.banner_url ? (
            <img src={p.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg, var(--profile-primary), var(--profile-accent))" }} />
          )}
        </div>

        {/* ── Avatar + Action Buttons Row ──────────────────────────── */}
        <div className="relative px-4 shrink-0">
          {/* Avatar: overlaps banner */}
          <div className="absolute -top-10 start-4">
            <AvatarDecorationWrapper
              decorationUrl={p?.avatar_decoration_url}
              isPro={p?.is_pro}
              size={80}
            >
              <Avatar className="h-20 w-20 border-[3px] border-black/40">
                <AvatarImage src={p?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initial}</AvatarFallback>
              </Avatar>
              <StatusBadge
                status={currentStatus}
                size="md"
                className="absolute bottom-0 end-0 z-20 translate-x-[2px] translate-y-[2px]"
              />
            </AvatarDecorationWrapper>
          </div>

          {/* Action buttons: right-aligned */}
          {isSelf ? (
            <div className="flex items-center justify-end pt-2 pb-1">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 h-8 text-xs bg-white/10 hover:bg-white/20 border-0"
                onClick={handleEditProfile}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("profile.editProfile", "Edit Profile")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-end pt-2 pb-1">
              <Button onClick={handleMessage} size="sm" className="gap-1.5 h-8 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("actions.message")}
              </Button>
              {renderFriendshipButton()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 border-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuItem onClick={() => profileUserId && openInviteToServer(profileUserId)}>
                    <UserPlus className="h-4 w-4 me-2" />
                    {t("inviteToServer.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => profileUserId && (isBlocked(profileUserId) ? unblockUser(profileUserId) : blockUser(profileUserId))}
                  >
                    <Ban className="h-4 w-4 me-2" />
                    {profileUserId && isBlocked(profileUserId) ? t("common.unblock") : t("common.block")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setReportOpen(true)}
                  >
                    <Flag className="h-4 w-4 me-2" />
                    {t("report.user.menuItem", "Report User")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* ── Identity Section ──────────────────────────────────────── */}
        <div className="px-4 pt-4 shrink-0">
          <StatusBubble
            statusText={effectiveStatusText}
            isEditable={isSelf}
            onClick={isSelf ? () => setStatusModalOpen(true) : undefined}
          />
          <StyledDisplayName
            displayName={p?.display_name || p?.username || "User"}
            fontStyle={p?.name_font}
            effect={p?.name_effect}
            gradientStart={p?.name_gradient_start}
            gradientEnd={p?.name_gradient_end}
            className="text-xl font-bold text-white"
          />
          {p?.username && (
            <p className="text-sm text-white/60 mt-0.5">@{p.username}</p>
          )}
        </div>

        {/* ── Separator ──────────────────────────────────────────────── */}
        <div className="px-4 pt-3 shrink-0">
          <Separator className="bg-white/10" />
        </div>

        {/* ── Body: isSelf vs !isSelf ──────────────────────────────── */}
        {isSelf ? (
          /* Self: clean body — About Me + Member Since, no tabs */
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {p?.about_me && (
              <Section label={t("profile.aboutMe", "About Me")}>
                <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{p.about_me}</p>
              </Section>
            )}
            {p?.created_at && (
              <Section label={t("profile.memberSince", "Member Since")}>
                <p className="text-sm text-white/70">
                  {format(new Date(p.created_at), "MMMM yyyy")}
                </p>
              </Section>
            )}
          </div>
        ) : (
          /* Other user: About Me + Note in body, then Activity / Mutual Friends / Mutual Servers tabs */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Fixed body sections */}
            <div className="shrink-0 px-4 py-3 space-y-4">
              {p?.about_me && (
                <Section label={t("profile.aboutMe", "About Me")}>
                  <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{p.about_me}</p>
                </Section>
              )}
              <Section label={t("profile.notes", "Notes")}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  placeholder={t("profile.notesPlaceholder", "Add a note about this user\u2026")}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/30"
                />
              </Section>
            </div>

            <div className="px-4 shrink-0">
              <Separator className="bg-white/10" />
            </div>

            {/* Tabs: Activity | Mutual Friends | Mutual Servers */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-4 mt-2 shrink-0 h-9 p-1 bg-black/30 border border-white/10 rounded-lg">
                <TabsTrigger
                  value="activity"
                  className="flex-1 text-xs font-semibold text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/15 data-[state=active]:shadow-none rounded-md transition-colors"
                >
                  {t("profile.activity", "Activity")}
                </TabsTrigger>
                <TabsTrigger
                  value="friends"
                  className="flex-1 text-xs font-semibold text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/15 data-[state=active]:shadow-none rounded-md transition-colors"
                >
                  {t("profile.mutualFriends", "Mutual Friends")}
                  {mutualFriends.length > 0 && (
                    <span className="ms-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                      {mutualFriends.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="servers"
                  className="flex-1 text-xs font-semibold text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/15 data-[state=active]:shadow-none rounded-md transition-colors"
                >
                  {t("profile.mutualServers", "Mutual Servers")}
                  {mutualServers.length > 0 && (
                    <span className="ms-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                      {mutualServers.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
                {/* Activity Tab — placeholder */}
                <TabsContent value="activity" className="mt-0">
                  <EmptyState icon={Gamepad2} label={t("profile.noActivity", "No activity to display")} />
                </TabsContent>

                {/* Mutual Friends Tab */}
                <TabsContent value="friends" className="mt-0">
                  {mutualFriends.length === 0 ? (
                    <EmptyState icon={Users} label={t("profile.noMutualFriends", "No mutual friends")} />
                  ) : (
                    <div className="space-y-0.5">
                      {mutualFriends.map((f) => (
                        <FriendRow key={f.user_id} profile={f} onOpen={openProfile} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Mutual Servers Tab */}
                <TabsContent value="servers" className="mt-0">
                  {mutualServers.length === 0 ? (
                    <EmptyState icon={Server} label={t("profile.noMutualServers", "No mutual servers")} />
                  ) : (
                    <div className="space-y-0.5">
                      {mutualServers.map((s) => (
                        <ServerRow key={s.id} server={s} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {/* Set Status Modal (self only) */}
        {statusModalOpen && isSelf && (
          <SetStatusModal
            onClose={() => setStatusModalOpen(false)}
            onSaved={async () => { await fetchProfile(); setStatusModalOpen(false); }}
          />
        )}
      </ProfileEffectWrapper>

      {/* Report User Dialog */}
      {!isSelf && profileUserId && profile && (
        <ReportUserDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetUserId={profileUserId}
          targetProfile={{
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
          }}
        />
      )}
    </div>
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading && isOpen) {
    const skeleton = (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
          <DrawerContent raw className="overflow-hidden">{skeleton}</DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <DialogContent className="p-0 w-full max-w-[600px] overflow-hidden rounded-2xl border-0">
          {skeleton}
        </DialogContent>
      </Dialog>
    );
  }

  if (!isOpen || !profile) return null;

  // ── Mobile: drawer ──────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <DrawerContent raw className="overflow-hidden max-h-[90vh]">
          {profileContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop: dialog ──────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
      <DialogContent className="p-0 w-full max-w-[600px] h-[680px] max-h-[90vh] overflow-hidden rounded-2xl border-0">
        {profileContent}
      </DialogContent>
    </Dialog>
  );
};

export default FullProfileModal;
