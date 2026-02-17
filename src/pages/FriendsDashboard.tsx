import React, { useEffect, useState, useMemo } from "react";
import { FriendListSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { Search, UserPlus, Check, X, MessageSquare, Trash2, ArrowLeft, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import UserContextMenu from "@/components/chat/UserContextMenu";

type Profile = Tables<"profiles">;

interface FriendshipWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: Profile | null;
}

const FriendsDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getUserStatus } = usePresence();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [friends, setFriends] = useState<FriendshipWithProfile[]>([]);
  const [pending, setPending] = useState<FriendshipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"online" | "all" | "pending" | "blocked" | "add">("online");

  const loadFriendships = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data) return;

    const otherIds = data.map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", otherIds.length > 0 ? otherIds : ["none"]);

    const withProfiles = data.map((f: any) => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      return {
        ...f,
        profile: profiles?.find((p) => p.user_id === otherId) || null,
      };
    });

    setFriends(withProfiles.filter((f) => f.status === "accepted"));
    setPending(withProfiles.filter((f) => f.status === "pending"));
    setLoading(false);
  };

  useEffect(() => {
    loadFriendships();

    const channel = supabase
      .channel("friends-dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        loadFriendships();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    if (activeTab !== "add" || !search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .neq("user_id", user?.id || "")
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user, activeTab]);

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: addresseeId });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("friends.requestSent") });
      setSearch("");
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" } as any).eq("id", friendshipId);
    toast({ title: t("friends.requestAccepted") });
  };

  const rejectOrCancel = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  };

  const startDM = async (otherUserId: string) => {
    if (!user) return;
    const [u1, u2] = [user.id, otherUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }
    const { data: newThread } = await supabase
      .from("dm_threads")
      .insert({ user1_id: u1, user2_id: u2 })
      .select("id")
      .single();
    if (newThread) navigate(`/chat/${newThread.id}`);
  };

  const existingFriendUserIds = new Set([
    ...friends.map((f) => f.requester_id === user?.id ? f.addressee_id : f.requester_id),
    ...pending.map((f) => f.requester_id === user?.id ? f.addressee_id : f.requester_id),
  ]);

  const initials = (p: Profile | null) =>
    (p?.display_name || p?.username || "?").charAt(0).toUpperCase();

  const onlineFriends = friends.filter((f) => {
    const status = getUserStatus(f.profile);
    return status !== "offline" && status !== "invisible";
  });

  // Sort friends alphabetically for "All" tab and group by first letter
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const nameA = (a.profile?.display_name || a.profile?.username || "").toLowerCase();
      const nameB = (b.profile?.display_name || b.profile?.username || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [friends]);

  const groupedFriends = useMemo(() => {
    const groups: { letter: string; friends: FriendshipWithProfile[] }[] = [];
    let currentLetter = "";
    for (const f of sortedFriends) {
      const name = f.profile?.display_name || f.profile?.username || "?";
      const letter = name.charAt(0).toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        groups.push({ letter, friends: [f] });
      } else {
        groups[groups.length - 1].friends.push(f);
      }
    }
    return groups;
  }, [sortedFriends]);

  const tabs = [
    { key: "online" as const, label: t("friends.online", "Online"), count: onlineFriends.length },
    { key: "all" as const, label: t("friends.all"), count: friends.length },
    { key: "pending" as const, label: t("friends.pending"), count: pending.length },
    { key: "blocked" as const, label: t("friends.blocked", "Blocked") },
  ];

  const renderFriendItem = (f: FriendshipWithProfile) => {
    const friendUserId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
    return (
      <UserContextMenu key={f.id} targetUserId={friendUserId} targetUsername={f.profile?.username || undefined}>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={f.profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary">{initials(f.profile)}</AvatarFallback>
            </Avatar>
            <StatusBadge status={(getUserStatus(f.profile) === "offline" ? "invisible" : getUserStatus(f.profile)) as UserStatus} className="absolute bottom-0 end-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{f.profile?.display_name || f.profile?.username || "User"}</p>
            {f.profile?.username && <p className="text-xs text-muted-foreground">@{f.profile.username}</p>}
          </div>
          <div className={`flex gap-1 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
            <Button variant="ghost" size="icon" onClick={() => startDM(friendUserId)} title="Message">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeFriend(f.id)} title={t("friends.remove")}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </UserContextMenu>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with tabs */}
      <header className="flex flex-col border-b border-border/50 glass sticky top-0 z-10 shrink-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">{t("friends.title")}</h2>
          {!isMobile && (
            <Button
              size="sm"
              onClick={() => setActiveTab("add")}
              className={activeTab === "add" ? "bg-primary text-primary-foreground" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {t("friends.addFriend")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-5 px-4 pb-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ms-1.5 text-xs text-muted-foreground">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add Friend inline section */}
        {activeTab === "add" && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t("friends.addFriend").toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t("friends.addFriendDescription", "You can add friends with their username.")}</p>
            <div className="relative mb-4">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-10"
                placeholder={t("friends.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              {searchResults.map((p) => {
                const alreadyFriend = existingFriendUserIds.has(p.user_id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary">{initials(p)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.display_name || p.username}</p>
                      {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                    </div>
                    {!alreadyFriend && (
                      <Button variant="outline" size="sm" onClick={() => sendRequest(p.user_id)}>
                        <UserPlus className="h-4 w-4 me-1" />
                        {t("friends.sendRequest")}
                      </Button>
                    )}
                  </div>
                );
              })}
              {!searching && search.trim() && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Online tab */}
        {activeTab === "online" && (
          loading ? <FriendListSkeleton count={6} /> : (
            <div className="animate-fade-in space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("friends.online", "Online")} — {onlineFriends.length}
              </p>
              {onlineFriends.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No friends online right now</p>
              )}
              {onlineFriends.map(renderFriendItem)}
            </div>
          )
        )}

        {/* All tab - with alphabetical grouping */}
        {activeTab === "all" && (
          loading ? <FriendListSkeleton count={6} /> : (
            <div className="animate-fade-in space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("friends.all")} — {friends.length}
              </p>
              {friends.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("friends.noFriends")}</p>
              )}
              {groupedFriends.map((group) => (
                <div key={group.letter}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">
                    {group.letter}
                  </p>
                  {group.friends.map(renderFriendItem)}
                </div>
              ))}
            </div>
          )
        )}

        {/* Pending tab */}
        {activeTab === "pending" && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("friends.pending")} — {pending.length}
            </p>
            {pending.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t("friends.noPending")}</p>
            )}
            {pending.map((f) => {
              const isIncoming = f.addressee_id === user?.id;
              return (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={f.profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary">{initials(f.profile)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.profile?.display_name || f.profile?.username || "User"}</p>
                    <p className="text-xs text-muted-foreground">{isIncoming ? t("friends.incoming") : t("friends.outgoing")}</p>
                  </div>
                  {isIncoming ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => acceptRequest(f.id)}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => rejectOrCancel(f.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => rejectOrCancel(f.id)}>
                      {t("friends.cancel")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Blocked tab */}
        {activeTab === "blocked" && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No blocked users</p>
          </div>
        )}
      </div>

      {/* Mobile FAB for Add Friend */}
      {isMobile && activeTab !== "add" && (
        <button
          onClick={() => setActiveTab("add")}
          className="absolute bottom-4 end-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
        >
          <UserPlus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default FriendsDashboard;
