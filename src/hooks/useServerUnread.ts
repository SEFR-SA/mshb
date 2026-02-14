import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useServerUnread(serverIds: string[]) {
  const { user } = useAuth();
  const [unreadMap, setUnreadMap] = useState<Map<string, boolean>>(new Map());

  const computeUnread = useCallback(async () => {
    if (!user || serverIds.length === 0) {
      setUnreadMap(new Map());
      return;
    }

    // Get all text channels for all servers
    const { data: channels } = await supabase
      .from("channels" as any)
      .select("id, server_id")
      .in("server_id", serverIds)
      .eq("type", "text");

    if (!channels || channels.length === 0) {
      setUnreadMap(new Map());
      return;
    }

    const channelIds = (channels as any[]).map((c) => c.id);

    // Get read statuses for these channels
    const { data: readStatuses } = await supabase
      .from("channel_read_status" as any)
      .select("channel_id, last_read_at")
      .eq("user_id", user.id)
      .in("channel_id", channelIds);

    const readMap = new Map<string, string>();
    ((readStatuses as any[]) || []).forEach((rs) => {
      readMap.set(rs.channel_id, rs.last_read_at);
    });

    // Build server->channels mapping
    const serverChannels = new Map<string, any[]>();
    (channels as any[]).forEach((c) => {
      const list = serverChannels.get(c.server_id) || [];
      list.push(c);
      serverChannels.set(c.server_id, list);
    });

    const newUnread = new Map<string, boolean>();

    // Check each server for unread messages
    for (const serverId of serverIds) {
      const chs = serverChannels.get(serverId) || [];
      let hasUnread = false;

      for (const ch of chs) {
        const lastRead = readMap.get(ch.id);
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", ch.id)
          .neq("author_id", user.id);
        if (lastRead) query = query.gt("created_at", lastRead);
        const { count } = await query;
        if (count && count > 0) {
          hasUnread = true;
          break;
        }
      }

      newUnread.set(serverId, hasUnread);
    }

    setUnreadMap(newUnread);
  }, [user, serverIds.join(",")]);

  useEffect(() => {
    computeUnread();

    const channel = supabase
      .channel("server-unread-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        computeUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_read_status" }, () => {
        computeUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [computeUnread]);

  return unreadMap;
}
