import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UnreadDMEntry {
  threadId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export function useUnreadDMs() {
  const { user } = useAuth();
  const [unreadDMs, setUnreadDMs] = useState<UnreadDMEntry[]>([]);
  const isMounted = useRef(true);

  const compute = useCallback(async () => {
    if (!user) { setUnreadDMs([]); return; }

    // Fetch all DM threads
    const { data: threads } = await supabase
      .from("dm_threads")
      .select("id, user1_id, user2_id, last_message_at")
      .order("last_message_at", { ascending: false });

    if (!threads || threads.length === 0) { setUnreadDMs([]); return; }

    // Fetch read statuses for all threads
    const threadIds = threads.map((t) => t.id);
    const { data: readStatuses } = await supabase
      .from("thread_read_status")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id)
      .in("thread_id", threadIds);

    const readMap = new Map<string, string>();
    (readStatuses || []).forEach((rs: any) => {
      if (rs.thread_id) readMap.set(rs.thread_id, rs.last_read_at);
    });

    // Collect other user ids
    const otherIds = threads.map((t) =>
      t.user1_id === user.id ? t.user2_id : t.user1_id
    );
    const uniqueOtherIds = [...new Set(otherIds)];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", uniqueOtherIds);

    const profileMap = new Map<string, { name: string; avatarUrl: string | null }>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.user_id, {
        name: p.display_name || p.username || "User",
        avatarUrl: p.avatar_url || null,
      });
    });

    // For each thread, count unread messages from the other person
    const results: UnreadDMEntry[] = [];

    for (const thread of threads) {
      const otherId = thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
      const lastRead = readMap.get(thread.id);

      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .neq("author_id", user.id);

      if (lastRead) query = query.gt("created_at", lastRead);

      const { count } = await query;

      if (count && count > 0) {
        const profile = profileMap.get(otherId);
        results.push({
          threadId: thread.id,
          userId: otherId,
          name: profile?.name || "User",
          avatarUrl: profile?.avatarUrl || null,
          unreadCount: count,
          lastMessageAt: thread.last_message_at,
        });
      }
    }

    if (isMounted.current) setUnreadDMs(results);
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    compute();

    const channel = supabase
      .channel("unread-dms-rail")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, compute)
      .on("postgres_changes", { event: "*", schema: "public", table: "thread_read_status" }, compute)
      .subscribe();

    return () => {
      isMounted.current = false;
      channel.unsubscribe();
    };
  }, [compute]);

  return { unreadDMs };
}
