import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Users, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import CreateGroupDialog from "@/components/CreateGroupDialog";

type Profile = Tables<"profiles">;

interface InboxItem {
  id: string;
  type: "dm" | "group";
  name: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  otherProfile?: Profile | null;
  memberCount?: number;
}

interface ChatSidebarProps {
  activeThreadId?: string;
}

const ChatSidebar = ({ activeThreadId }: ChatSidebarProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getUserStatus } = usePresence();
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const loadInbox = async () => {
    if (!user) return;

    // Load pinned chats
    const { data: pins } = await supabase
      .from("pinned_chats")
      .select("thread_id, group_thread_id")
      .eq("user_id", user.id);
    const pinSet = new Set<string>();
    pins?.forEach((p: any) => {
      if (p.thread_id) pinSet.add(p.thread_id);
      if (p.group_thread_id) pinSet.add(p.group_thread_id);
    });
    setPinnedIds(pinSet);

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

    const all = [...dmItems, ...groupItems].sort((a, b) => {
      const aPin = pinSet.has(a.id) ? 0 : 1;
      const bPin = pinSet.has(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      const aTime = a.lastMessageAt || "";
      const bTime = b.lastMessageAt || "";
      return bTime.localeCompare(aTime);
    });

    setItems(all);
  };

  useEffect(() => {
    loadInbox();

    const channel = supabase
      .channel("sidebar-inbox-updates")
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

  return (
    <div className="flex flex-col h-full w-64 border-e border-border/50 glass">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("inbox.title")}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateGroupOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="ps-8 h-8 text-sm"
            placeholder={t("inbox.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search Results */}
      {search.trim() && (
        <div className="px-2 pb-2 space-y-0.5">
          {searchResults.map((p) => (
            <button
              key={p.id}
              onClick={() => startDM(p.user_id)}
              className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-muted/50 transition-colors text-start"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{p.display_name || p.username}</span>
            </button>
          ))}
          {!searching && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
          )}
        </div>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {/* Pinned section */}
        {items.some((item) => pinnedIds.has(item.id)) && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1 flex items-center gap-1">
              <Pin className="h-3 w-3" /> {t("chat.pinned")}
            </p>
            {items.filter((item) => pinnedIds.has(item.id)).map((item) => {
              const isActive = item.id === activeThreadId;
              return (
                <button key={item.id} onClick={() => navigate(item.type === "dm" ? `/chat/${item.id}` : `/group/${item.id}`)}
                  className={`flex items-center gap-2.5 w-full p-2 rounded-md transition-colors text-start ${isActive ? "bg-muted" : "hover:bg-muted/50"}`}>
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9"><AvatarImage src={item.avatarUrl} /><AvatarFallback className="bg-primary/20 text-primary text-sm">{item.type === "group" ? <Users className="h-4 w-4" /> : item.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    {item.type === "dm" && item.otherProfile && <StatusBadge status={(getUserStatus(item.otherProfile) === "offline" ? "invisible" : getUserStatus(item.otherProfile)) as UserStatus} className="absolute bottom-0 end-0" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.unreadCount > 0 && <span className="ms-1 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">{item.unreadCount}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.lastMessage || ""}</p>
                  </div>
                </button>
              );
            })}
            <div className="border-b border-border/30 my-1" />
          </>
        )}
        {items.filter((item) => !pinnedIds.has(item.id)).map((item) => {
          const isActive = item.id === activeThreadId;
          return (
            <button key={item.id} onClick={() => navigate(item.type === "dm" ? `/chat/${item.id}` : `/group/${item.id}`)}
              className={`flex items-center gap-2.5 w-full p-2 rounded-md transition-colors text-start ${isActive ? "bg-muted" : "hover:bg-muted/50"}`}>
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9"><AvatarImage src={item.avatarUrl} /><AvatarFallback className="bg-primary/20 text-primary text-sm">{item.type === "group" ? <Users className="h-4 w-4" /> : item.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                {item.type === "dm" && item.otherProfile && <StatusBadge status={(getUserStatus(item.otherProfile) === "offline" ? "invisible" : getUserStatus(item.otherProfile)) as UserStatus} className="absolute bottom-0 end-0" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.unreadCount > 0 && <span className="ms-1 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">{item.unreadCount}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.lastMessage || ""}</p>
              </div>
            </button>
          );
        })}
      </div>

      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </div>
  );
};

export default ChatSidebar;
