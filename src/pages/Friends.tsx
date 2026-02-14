import React, { useEffect, useState, useMemo } from "react";
import { FriendListSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { Search, UserPlus, Check, X, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import ActiveNowPanel from "@/components/chat/ActiveNowPanel";

type Profile = Tables<"profiles">;

interface FriendshipWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: Profile | null;
}

const Friends = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getUserStatus } = usePresence();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendshipWithProfile[]>([]);
  const [pending, setPending] = useState<FriendshipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

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
      .channel("friendships-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        loadFriendships();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    if (!search.trim()) {
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
  }, [search, user]);

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

  const friendUserIds = useMemo(() => 
    friends.map((f) => f.requester_id === user?.id ? f.addressee_id : f.requester_id),
    [friends, user]
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-3">{t("friends.title")}</h2>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden px-4">
        <TabsList className="w-full bg-muted/40 backdrop-blur-sm">
          <TabsTrigger value="all" className="flex-1">{t("friends.all")}</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            {t("friends.pending")}
            {pending.length > 0 && (
              <span className="ms-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="add" className="flex-1">{t("friends.add")}</TabsTrigger>
        </TabsList>

        {/* All Friends */}
        <TabsContent value="all" className="flex-1 overflow-y-auto mt-3 space-y-1">
          {loading ? (
            <FriendListSkeleton count={6} />
          ) : (
            <div className="animate-fade-in space-y-1">
              {friends.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("friends.noFriends")}</p>
              )}
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
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
                  <Button variant="ghost" size="icon" onClick={() => startDM(f.requester_id === user?.id ? f.addressee_id : f.requester_id)} title="Message">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeFriend(f.id)} title={t("friends.remove")}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="flex-1 overflow-y-auto mt-3 space-y-1">
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
        </TabsContent>

        {/* Add Friend */}
        <TabsContent value="add" className="flex-1 overflow-y-auto mt-3">
          <div className="relative mb-3">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-10"
              placeholder={t("friends.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:block w-[280px] border-s border-border">
        <ActiveNowPanel friendUserIds={friendUserIds} />
      </div>
    </div>
  );
};

export default Friends;
