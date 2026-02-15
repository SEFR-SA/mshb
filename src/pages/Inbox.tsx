import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { SidebarItemSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useIsMobile } from "@/hooks/use-mobile";
import ThreadContextMenu from "@/components/chat/ThreadContextMenu";

type Profile = Tables<"profiles">;
type Thread = Tables<"dm_threads">;

interface InboxItem {
  id: string;
  type: "dm" | "group";
  name: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  // DM-specific
  otherProfile?: Profile | null;
  // Group-specific
  memberCount?: number;
}

const Inbox = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline, getUserStatus } = usePresence();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Auto-redirect to last DM thread on mount (desktop only)
  useEffect(() => {
    if (!user || isMobile) {
      setRedirecting(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dm_threads")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && !cancelled) {
        navigate(`/chat/${data.id}`, { replace: true });
      } else if (!cancelled) {
        setRedirecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate, isMobile]);

  const loadInbox = async () => {
    if (!user) return;

    // Load DM threads
    const { data: rawThreads } = await supabase
      .from("dm_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    const dmItems: InboxItem[] = [];

    if (rawThreads && rawThreads.length > 0) {
      const otherIds = rawThreads.map((t) =>
        t.user1_id === user.id ? t.user2_id : t.user1_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", otherIds);

      for (const thread of rawThreads) {
        const otherId = thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
        const otherProfile = profiles?.find((p) => p.user_id === otherId) || null;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, deleted_for_everyone, author_id")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let lastMessage = "";
        if (lastMsg) {
          if (lastMsg.deleted_for_everyone) {
            lastMessage = t("chat.deleted");
          } else {
            const prefix = lastMsg.author_id === user.id ? `${t("inbox.you")}: ` : "";
            lastMessage = prefix + (lastMsg.content || "").slice(0, 50);
          }
        }

        const { data: readStatus } = await supabase
          .from("thread_read_status")
          .select("last_read_at")
          .eq("user_id", user.id)
          .eq("thread_id", thread.id)
          .maybeSingle();

        let unreadQuery = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("author_id", user.id);
        if (readStatus?.last_read_at) unreadQuery = unreadQuery.gt("created_at", readStatus.last_read_at);
        const { count: unreadCount } = await unreadQuery;

        dmItems.push({
          id: thread.id,
          type: "dm",
          name: otherProfile?.display_name || otherProfile?.username || "User",
          avatarUrl: otherProfile?.avatar_url || "",
          lastMessage,
          lastMessageAt: thread.last_message_at,
          unreadCount: unreadCount || 0,
          otherProfile,
        });
      }
    }

    // Load group threads
    const { data: groupThreads } = await supabase
      .from("group_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    const groupItems: InboxItem[] = [];

    if (groupThreads && groupThreads.length > 0) {
      for (const group of groupThreads as any[]) {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, deleted_for_everyone, author_id")
          .eq("group_thread_id", group.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let lastMessage = "";
        if (lastMsg) {
          if (lastMsg.deleted_for_everyone) {
            lastMessage = t("chat.deleted");
          } else {
            const prefix = lastMsg.author_id === user.id ? `${t("inbox.you")}: ` : "";
            lastMessage = prefix + (lastMsg.content || "").slice(0, 50);
          }
        }

        const { count: memberCount } = await supabase
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group.id);

        groupItems.push({
          id: group.id,
          type: "group",
          name: group.name,
          avatarUrl: group.avatar_url || "",
          lastMessage,
          lastMessageAt: group.last_message_at,
          unreadCount: 0,
          memberCount: memberCount || 0,
        });
      }
    }

    // Merge and sort by last_message_at
    const all = [...dmItems, ...groupItems].sort((a, b) => {
      const aTime = a.lastMessageAt || "";
      const bTime = b.lastMessageAt || "";
      return bTime.localeCompare(aTime);
    });

    setItems(all);
    setLoading(false);
  };

  useEffect(() => {
    loadInbox();

    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadInbox())
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, () => loadInbox())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_threads" }, () => loadInbox())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => loadInbox())
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

  const startDM = async (otherUserId: string) => {
    if (!user) return;
    const [u1, u2] = [user.id, otherUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const { data: newThread } = await supabase
      .from("dm_threads")
      .insert({ user1_id: u1, user2_id: u2 })
      .select("id")
      .single();
    if (newThread) navigate(`/chat/${newThread.id}`);
  };

  const togglePinItem = async (itemId: string, type: "dm" | "group") => {
    if (!user) return;
    const isPinned = pinnedIds.has(itemId);
    if (isPinned) {
      if (type === "dm") {
        await supabase.from("pinned_chats").delete().eq("user_id", user.id).eq("thread_id", itemId);
      } else {
        await supabase.from("pinned_chats").delete().eq("user_id", user.id).eq("group_thread_id", itemId);
      }
      setPinnedIds(prev => { const n = new Set(prev); n.delete(itemId); return n; });
    } else {
      if (type === "dm") {
        await supabase.from("pinned_chats").insert({ user_id: user.id, thread_id: itemId } as any);
      } else {
        await supabase.from("pinned_chats").insert({ user_id: user.id, group_thread_id: itemId } as any);
      }
      setPinnedIds(prev => new Set(prev).add(itemId));
    }
  };

  const markAsReadInbox = async (itemId: string, type: "dm" | "group") => {
    if (!user) return;
    const now = new Date().toISOString();
    if (type === "dm") {
      await supabase.from("thread_read_status").upsert(
        { user_id: user.id, thread_id: itemId, last_read_at: now },
        { onConflict: "user_id,thread_id" }
      );
    } else {
      await supabase.from("thread_read_status").upsert(
        { user_id: user.id, group_thread_id: itemId, last_read_at: now } as any,
        { onConflict: "user_id,thread_id" }
      );
    }
    loadInbox();
  };

  if (redirecting) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("inbox.title")}</h2>
          <Button variant="outline" size="sm" onClick={() => setCreateGroupOpen(true)}>
            <Users className="h-4 w-4 me-1" />
            {t("inbox.createGroup")}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-10"
            placeholder={t("inbox.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search Results */}
      {search.trim() && (
        <div className="px-4 pb-2 space-y-1">
          {searchResults.map((p) => (
            <button
              key={p.id}
              onClick={() => startDM(p.user_id)}
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-start"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <StatusBadge status={(getUserStatus(p) === "offline" ? "invisible" : getUserStatus(p)) as UserStatus} className="absolute bottom-0 end-0" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{p.display_name || p.username}</p>
                {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
              </div>
              <Plus className="h-4 w-4 text-muted-foreground ms-auto" />
            </button>
          ))}
          {!searching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No users found</p>
          )}
        </div>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SidebarItemSkeleton count={8} />
        ) : (
          <div className="animate-fade-in">
            {items.length === 0 && !search.trim() && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquareIcon className="h-12 w-12 mb-2 opacity-30" />
                <p>{t("inbox.noThreads")}</p>
                <p className="text-sm">{t("inbox.startChat")}</p>
              </div>
            )}
            {items.map((item) => (
              <ThreadContextMenu
                key={item.id}
                isPinned={pinnedIds.has(item.id)}
                onTogglePin={() => togglePinItem(item.id, item.type)}
                onMarkAsRead={() => markAsReadInbox(item.id, item.type)}
              >
              <button
                onClick={() => navigate(item.type === "dm" ? `/chat/${item.id}` : `/group/${item.id}`)}
                className="flex items-center gap-3 w-full p-3 px-4 hover:bg-muted/50 transition-colors text-start border-b border-border/30"
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={item.avatarUrl} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {item.type === "group" ? <Users className="h-5 w-5" /> : item.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {item.type === "dm" && item.otherProfile && (
                    <StatusBadge status={(getUserStatus(item.otherProfile) === "offline" ? "invisible" : getUserStatus(item.otherProfile)) as UserStatus} className="absolute bottom-0 end-0" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.unreadCount > 0 && (
                      <span className="ms-2 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{item.lastMessage || ""}</p>
                  {item.type === "group" && (
                    <p className="text-xs text-muted-foreground/70">
                      <Users className="h-3 w-3 inline me-1" />
                      {item.memberCount}
                    </p>
                  )}
                  {item.type === "dm" && getUserStatus(item.otherProfile) === "offline" && item.otherProfile?.last_seen && (
                    <p className="text-xs text-muted-foreground/70">
                      {t("presence.lastSeen", { time: formatDistanceToNow(new Date(item.otherProfile.last_seen)) })}
                    </p>
                  )}
                </div>
              </button>
              </ThreadContextMenu>
            ))}
          </div>
        )}
      </div>

      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </div>
  );
};

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

export default Inbox;
