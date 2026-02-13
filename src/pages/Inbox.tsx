import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

type Profile = Tables<"profiles">;
type Thread = Tables<"dm_threads">;

interface ThreadWithProfile extends Thread {
  otherProfile: Profile | null;
  lastMessage?: string;
  unreadCount?: number;
}

const Inbox = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline, getUserStatus } = usePresence();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadWithProfile[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const loadThreads = async () => {
    if (!user) return;
    const { data: rawThreads } = await supabase
      .from("dm_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (!rawThreads) return;

    const otherIds = rawThreads.map((t) =>
      t.user1_id === user.id ? t.user2_id : t.user1_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", otherIds);

    // Get last message for each thread
    const threadsWithProfiles: ThreadWithProfile[] = await Promise.all(
      rawThreads.map(async (thread) => {
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

        // Unread count
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

        return { ...thread, otherProfile, lastMessage, unreadCount: unreadCount || 0 };
      })
    );

    setThreads(threadsWithProfiles);
  };

  useEffect(() => {
    loadThreads();

    // Subscribe to new messages for live updates
    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadThreads();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, () => {
        loadThreads();
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

  const startDM = async (otherUserId: string) => {
    if (!user) return;
    const [u1, u2] = [user.id, otherUserId].sort();

    // Check existing thread
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <h2 className="text-xl font-bold">{t("inbox.title")}</h2>
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
                <span className="absolute bottom-0 end-0 border-2 border-background rounded-full">
                  <StatusBadge status={(getUserStatus(p) === "offline" ? "invisible" : getUserStatus(p)) as UserStatus} />
                </span>
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
        {threads.length === 0 && !search.trim() && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquareIcon className="h-12 w-12 mb-2 opacity-30" />
            <p>{t("inbox.noThreads")}</p>
            <p className="text-sm">{t("inbox.startChat")}</p>
          </div>
        )}
        {threads.map((thread) => {
          const p = thread.otherProfile;
          const otherId = thread.user1_id === user?.id ? thread.user2_id : thread.user1_id;
          return (
            <button
              key={thread.id}
              onClick={() => navigate(`/chat/${thread.id}`)}
              className="flex items-center gap-3 w-full p-3 px-4 hover:bg-muted/50 transition-colors text-start border-b border-border/30"
            >
              <div className="relative">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={p?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {(p?.display_name || p?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 end-0 border-2 border-background rounded-full">
                  <StatusBadge status={(getUserStatus(p) === "offline" ? "invisible" : getUserStatus(p)) as UserStatus} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{p?.display_name || p?.username || "User"}</p>
                  {(thread.unreadCount ?? 0) > 0 && (
                    <span className="ms-2 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{thread.lastMessage || ""}</p>
                {getUserStatus(p) === "offline" && p?.last_seen && (
                  <p className="text-xs text-muted-foreground/70">
                    {t("presence.lastSeen", { time: formatDistanceToNow(new Date(p.last_seen)) })}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Simple icon component
const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

export default Inbox;
