import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ChannelNotifLevel = "all_messages" | "only_mentions" | "nothing";

export function useChannelNotificationPref(channelId: string | null) {
  const { user } = useAuth();
  const [level, setLevelState] = useState<ChannelNotifLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !channelId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("channel_notification_prefs" as any)
      .select("level")
      .eq("user_id", user.id)
      .eq("channel_id", channelId)
      .maybeSingle()
      .then(({ data }) => {
        setLevelState((data as any)?.level ?? null);
        setLoading(false);
      });
  }, [user, channelId]);

  const setLevel = useCallback(async (newLevel: ChannelNotifLevel | null) => {
    if (!user || !channelId) return;
    setLevelState(newLevel);
    if (newLevel === null) {
      await supabase
        .from("channel_notification_prefs" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("channel_id", channelId);
    } else {
      await supabase
        .from("channel_notification_prefs" as any)
        .upsert({ user_id: user.id, channel_id: channelId, level: newLevel } as any, { onConflict: "user_id,channel_id" });
    }
  }, [user, channelId]);

  return { level, setLevel, loading };
}

/** Batch-fetch channel notification prefs for multiple channels */
export function useChannelNotificationPrefs(channelIds: string[]) {
  const { user } = useAuth();
  const [prefsMap, setPrefsMap] = useState<Map<string, ChannelNotifLevel>>(new Map());

  useEffect(() => {
    if (!user || channelIds.length === 0) return;
    supabase
      .from("channel_notification_prefs" as any)
      .select("channel_id, level")
      .eq("user_id", user.id)
      .in("channel_id", channelIds)
      .then(({ data }) => {
        const map = new Map<string, ChannelNotifLevel>();
        ((data as any[]) || []).forEach((r) => map.set(r.channel_id, r.level));
        setPrefsMap(map);
      });
  }, [user, channelIds.join(",")]);

  const setLevel = useCallback(async (channelId: string, newLevel: ChannelNotifLevel | null) => {
    if (!user) return;
    if (newLevel === null) {
      setPrefsMap((prev) => { const next = new Map(prev); next.delete(channelId); return next; });
      await supabase
        .from("channel_notification_prefs" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("channel_id", channelId);
    } else {
      setPrefsMap((prev) => new Map(prev).set(channelId, newLevel));
      await supabase
        .from("channel_notification_prefs" as any)
        .upsert({ user_id: user.id, channel_id: channelId, level: newLevel } as any, { onConflict: "user_id,channel_id" });
    }
  }, [user]);

  return { prefsMap, setLevel };
}
