import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChannelUnread(channelIds: string[]) {
  const { user } = useAuth();
  const [unreadSet, setUnreadSet] = useState<Set<string>>(new Set());

  const computeUnread = useCallback(async () => {
    if (!user || channelIds.length === 0) {
      setUnreadSet(new Set());
      return;
    }

    const { data: readStatuses } = await supabase
      .from("channel_read_status" as any)
      .select("channel_id, last_read_at")
      .eq("user_id", user.id)
      .in("channel_id", channelIds);

    const readMap = new Map<string, string>();
    ((readStatuses as any[]) || []).forEach((rs) => {
      readMap.set(rs.channel_id, rs.last_read_at);
    });

    const newUnread = new Set<string>();

    for (const chId of channelIds) {
      const lastRead = readMap.get(chId);
      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", chId)
        .neq("author_id", user.id);
      if (lastRead) query = query.gt("created_at", lastRead);
      const { count } = await query;
      if (count && count > 0) newUnread.add(chId);
    }

    setUnreadSet(newUnread);
  }, [user, channelIds.join(",")]);

  useEffect(() => {
    computeUnread();

    const channel = supabase
      .channel("channel-unread-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        computeUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_read_status" }, () => {
        computeUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [computeUnread]);

  return unreadSet;
}
