import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useDirectCall } from "@/hooks/useDirectCall";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { MessageSquare, Phone, Users, Server } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";
import SetStatusModal from "@/components/settings/SetStatusModal";

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
    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors text-start"
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
    <div className="h-8 w-8 rounded-lg shrink-0 bg-muted flex items-center justify-center overflow-hidden">
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
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon className="h-8 w-8 text-muted-foreground/25 mb-2" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FullProfileModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profileUserId, openProfile, closeProfile } = useUserProfile();
  const { directCall } = useDirectCall();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [profile, setProfile]               = useState<Profile | null>(null);
  const [mutualFriends, setMutualFriends]   = useState<MutualFriend[]>([]);
  const [mutualServers, setMutualServers]   = useState<MutualServer[]>([]);
  const [note, setNote]                     = useState("");
  const [activeTab, setActiveTab]           = useState<"friends" | "servers">("friends");
  const [loading, setLoading]               = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

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

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProfile();
    setMutualFriends([]);
    setMutualServers([]);
    setNote("");
    setActiveTab("friends");
  }, [fetchProfile]);

  useEffect(() => {
    if (!profileUserId) return;
    fetchMutualFriends();
    fetchMutualServers();
    fetchNote();
  }, [fetchMutualFriends, fetchMutualServers, fetchNote]);

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

  const handleCall = () => {
    if (!profileUserId || isSelf) return;
    directCall(profileUserId);
    closeProfile();
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const p = profile as any;
  const effectiveStatusText =
    p?.status_until && new Date(p.status_until) < new Date() ? null : p?.status_text ?? null;
  const initial = (p?.display_name || p?.username || "?").charAt(0).toUpperCase();

  // ── Compact content (mobile / fallback) ──────────────────────────────────

  const compactContent = (
    <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={p?.is_pro} className="flex flex-col">
      <div
        className="h-24 rounded-t-lg"
        style={{
          background: p?.banner_url
            ? `url(${p.banner_url}) center/cover`
            : "hsl(var(--primary) / 0.2)",
        }}
      />
      <div className="px-4 -mt-10 relative z-10 flex items-end gap-2">
        <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={p?.is_pro} size={80} className="shrink-0">
          <Avatar className="h-20 w-20 border-4 border-popover">
            <AvatarImage src={p?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initial}</AvatarFallback>
          </Avatar>
        </AvatarDecorationWrapper>
        <StatusBubble
          statusText={effectiveStatusText}
          isEditable={isSelf}
          onClick={isSelf ? () => setStatusModalOpen(true) : undefined}
        />
      </div>
      <div className="px-4 pt-2 pb-4 space-y-4">
        <div>
          <StyledDisplayName
            displayName={p?.display_name || p?.username || "User"}
            fontStyle={p?.name_font}
            effect={p?.name_effect}
            gradientStart={p?.name_gradient_start}
            gradientEnd={p?.name_gradient_end}
            className="text-xl font-bold"
          />
          {p?.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
        </div>
        {!isSelf && (
          <div className="flex gap-2">
            <Button onClick={handleMessage} className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("actions.message")}
            </Button>
            <Button variant="secondary" size="icon" onClick={handleCall}>
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        )}
        {p?.about_me && (
          <Section label={t("profile.aboutMe", "About Me")}>
            <p className="text-sm">{p.about_me}</p>
          </Section>
        )}
        {p?.created_at && (
          <Section label={t("profile.memberSince", "Member Since")}>
            <p className="text-sm text-muted-foreground">{format(new Date(p.created_at), "MMMM yyyy")}</p>
          </Section>
        )}
      </div>
      {statusModalOpen && isSelf && (
        <SetStatusModal
          onClose={() => setStatusModalOpen(false)}
          onSaved={async () => { await fetchProfile(); setStatusModalOpen(false); }}
        />
      )}
    </ProfileEffectWrapper>
  );

  // ── Desktop two-column content ────────────────────────────────────────────

  const desktopContent = (
    <div className="flex w-full h-full">
      {/* ── Left column — profile card ──────────────────────────────────── */}
      <div className="p-6 shrink-0 h-full">
        <ProfileEffectWrapper
          effectUrl={p?.profile_effect_url}
          isPro={p?.is_pro}
          className="w-[400px] h-full rounded-xl overflow-hidden bg-card relative"
        >
          {/* Banner */}
          <div
            className="absolute top-0 left-0 w-full h-[140px]"
            style={{
              background: p?.banner_url
                ? `url(${p.banner_url}) center/cover`
                : "hsl(var(--primary) / 0.25)",
            }}
          />

          {/* Avatar — overlaps banner */}
          <div className="absolute left-4" style={{ top: 76 }}>
            <AvatarDecorationWrapper
              decorationUrl={p?.avatar_decoration_url}
              isPro={p?.is_pro}
              size={120}
            >
              <Avatar className="h-[120px] w-[120px] border-4 border-card">
                <AvatarImage src={p?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-4xl">{initial}</AvatarFallback>
              </Avatar>
            </AvatarDecorationWrapper>
          </div>

          {/* Scrollable body — starts below avatar */}
          <div className="absolute inset-0 overflow-y-auto" style={{ top: 208 }}>
            <div className="px-4 pb-6 space-y-4 pt-3">
              {/* Status bubble */}
              <StatusBubble
                statusText={effectiveStatusText}
                isEditable={isSelf}
                onClick={isSelf ? () => setStatusModalOpen(true) : undefined}
              />

              {/* Name + username */}
              <div>
                <StyledDisplayName
                  displayName={p?.display_name || p?.username || "User"}
                  fontStyle={p?.name_font}
                  effect={p?.name_effect}
                  gradientStart={p?.name_gradient_start}
                  gradientEnd={p?.name_gradient_end}
                  className="text-xl font-bold"
                />
                {p?.username && (
                  <p className="text-sm text-muted-foreground">@{p.username}</p>
                )}
              </div>

              {/* Actions (non-self) */}
              {!isSelf && (
                <div className="flex gap-2">
                  <Button onClick={handleMessage} className="flex-1 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t("actions.message")}
                  </Button>
                  <Button variant="secondary" size="icon" onClick={handleCall}>
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* About Me */}
              {p?.about_me && (
                <Section label={t("profile.aboutMe", "About Me")}>
                  <p className="text-sm leading-relaxed">{p.about_me}</p>
                </Section>
              )}

              {/* Member Since */}
              {p?.created_at && (
                <Section label={t("profile.memberSince", "Member Since")}>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(p.created_at), "MMMM yyyy")}
                  </p>
                </Section>
              )}

              {/* Notes (non-self only) */}
              {!isSelf && (
                <Section label={t("profile.notes", "Notes")}>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={saveNote}
                    placeholder={t("profile.notesPlaceholder", "Add a note about this user…")}
                    rows={3}
                    className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                  />
                </Section>
              )}
            </div>
          </div>

          {/* Set Status Modal (self only) */}
          {statusModalOpen && isSelf && (
            <SetStatusModal
              onClose={() => setStatusModalOpen(false)}
              onSaved={async () => { await fetchProfile(); setStatusModalOpen(false); }}
            />
          )}
        </ProfileEffectWrapper>
      </div>

      {/* ── Right column — tabs ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 py-6 pe-6">
        {/* Tab pills */}
        {!isSelf && (
          <div className="flex gap-1.5 mb-4 shrink-0">
            {(["friends", "servers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/20 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                )}
              >
                {tab === "friends"
                  ? t("profile.mutualFriends", "Mutual Friends")
                  : t("profile.mutualServers", "Mutual Servers")}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isSelf ? (
            <EmptyState icon={Users} label="Open another user's profile to see mutual friends and servers." />
          ) : activeTab === "friends" ? (
            mutualFriends.length === 0 ? (
              <EmptyState icon={Users} label={t("profile.noMutualFriends", "No mutual friends")} />
            ) : (
              <div className="space-y-0.5">
                {mutualFriends.map((f) => (
                  <FriendRow key={f.user_id} profile={f} onOpen={openProfile} />
                ))}
              </div>
            )
          ) : (
            mutualServers.length === 0 ? (
              <EmptyState icon={Server} label={t("profile.noMutualServers", "No mutual servers")} />
            ) : (
              <div className="space-y-0.5">
                {mutualServers.map((s) => (
                  <ServerRow key={s.id} server={s} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
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
        <DialogContent className="p-0 w-full max-w-[960px] h-[800px] max-h-[95vh] overflow-hidden rounded-2xl">
          {skeleton}
        </DialogContent>
      </Dialog>
    );
  }

  if (!isOpen || !profile) return null;

  // ── Mobile: compact drawer ────────────────────────────────────────────────

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <DrawerContent>{compactContent}</DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop: full two-column dialog ──────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
      <DialogContent className="p-0 w-full max-w-[960px] h-[800px] max-h-[95vh] overflow-hidden rounded-2xl border-0 flex">
        {desktopContent}
      </DialogContent>
    </Dialog>
  );
};

export default FullProfileModal;
