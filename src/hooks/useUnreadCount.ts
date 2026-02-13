import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadCount() {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const computeUnread = async () => {
    if (!user) { setTotalUnread(0); return; }

    // DM threads unread
    const { data: threads } = await supabase
      .from("dm_threads")
      .select("id");

    const { data: readStatuses } = await supabase
      .from("thread_read_status")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id);

    const readMap = new Map<string, string>();
    (readStatuses || []).forEach((rs: any) => {
      if (rs.thread_id) readMap.set(rs.thread_id, rs.last_read_at);
    });

    let total = 0;

    if (threads) {
      for (const thread of threads) {
        const lastRead = readMap.get(thread.id);
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("author_id", user.id);
        if (lastRead) query = query.gt("created_at", lastRead);
        const { count } = await query;
        total += count || 0;
      }
    }

    setTotalUnread(total);
  };

  useEffect(() => {
    computeUnread();

    const channel = supabase
      .channel("unread-count-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        computeUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "thread_read_status" }, () => {
        computeUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  return { totalUnread };
}
