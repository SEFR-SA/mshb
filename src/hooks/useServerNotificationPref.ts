import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type NotifLevel = "all_messages" | "only_mentions" | "nothing";

export function useServerNotificationPref(serverId: string | null) {
  const { user } = useAuth();
  const [level, setLevelState] = useState<NotifLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !serverId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("server_notification_prefs" as any)
      .select("level")
      .eq("user_id", user.id)
      .eq("server_id", serverId)
      .maybeSingle()
      .then(({ data }) => {
        setLevelState((data as any)?.level ?? null);
        setLoading(false);
      });
  }, [user, serverId]);

  const setLevel = useCallback(async (newLevel: NotifLevel) => {
    if (!user || !serverId) return;
    setLevelState(newLevel);
    await supabase
      .from("server_notification_prefs" as any)
      .upsert({ user_id: user.id, server_id: serverId, level: newLevel } as any, { onConflict: "user_id,server_id" });
  }, [user, serverId]);

  return { level, setLevel, loading };
}

/** Batch-fetch notification prefs for multiple servers */
export function useServerNotificationPrefs(serverIds: string[]) {
  const { user } = useAuth();
  const [prefsMap, setPrefsMap] = useState<Map<string, NotifLevel>>(new Map());

  useEffect(() => {
    if (!user || serverIds.length === 0) return;
    supabase
      .from("server_notification_prefs" as any)
      .select("server_id, level")
      .eq("user_id", user.id)
      .in("server_id", serverIds)
      .then(({ data }) => {
        const map = new Map<string, NotifLevel>();
        ((data as any[]) || []).forEach((r) => map.set(r.server_id, r.level));
        setPrefsMap(map);
      });
  }, [user, serverIds.join(",")]);

  const setLevel = useCallback(async (serverId: string, newLevel: NotifLevel) => {
    if (!user) return;
    setPrefsMap((prev) => new Map(prev).set(serverId, newLevel));
    await supabase
      .from("server_notification_prefs" as any)
      .upsert({ user_id: user.id, server_id: serverId, level: newLevel } as any, { onConflict: "user_id,server_id" });
  }, [user]);

  return { prefsMap, setLevel };
}
