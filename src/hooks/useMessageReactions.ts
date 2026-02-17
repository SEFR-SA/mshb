import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export const useMessageReactions = (messageIds: string[]) => {
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());

  const buildReactionsMap = useCallback((rows: any[]) => {
    const map = new Map<string, Map<string, string[]>>();
    rows.forEach((r) => {
      if (!map.has(r.message_id)) map.set(r.message_id, new Map());
      const emojiMap = map.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
      emojiMap.get(r.emoji)!.push(r.user_id);
    });
    const result = new Map<string, Reaction[]>();
    map.forEach((emojiMap, msgId) => {
      const arr: Reaction[] = [];
      emojiMap.forEach((userIds, emoji) => {
        arr.push({ emoji, count: userIds.length, userIds });
      });
      result.set(msgId, arr);
    });
    return result;
  }, []);

  const fetchReactions = useCallback(async () => {
    if (messageIds.length === 0) return;
    const { data } = await (supabase.from("message_reactions") as any)
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);
    if (data) setReactions(buildReactionsMap(data));
  }, [messageIds.join(",")]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Realtime subscription for reaction changes
  useEffect(() => {
    if (messageIds.length === 0) return;
    const channel = supabase
      .channel(`reactions-${messageIds[0]?.slice(0, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        if (row && messageIds.includes(row.message_id)) {
          fetchReactions();
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [messageIds.join(","), fetchReactions]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string, userId: string) => {
    const msgReactions = reactions.get(messageId) || [];
    const existing = msgReactions.find((r) => r.emoji === emoji);
    if (existing?.userIds.includes(userId)) {
      await (supabase.from("message_reactions") as any)
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      await (supabase.from("message_reactions") as any)
        .insert({ message_id: messageId, user_id: userId, emoji });
    }
  }, [reactions]);

  return { reactions, toggleReaction };
};
