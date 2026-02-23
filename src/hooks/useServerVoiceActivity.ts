import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VoiceActivity {
  hasVoice: boolean;
  hasScreenShare: boolean;
}

export function useServerVoiceActivity(serverIds: string[]) {
  const [activityMap, setActivityMap] = useState<Map<string, VoiceActivity>>(new Map());

  const computeActivity = useCallback(async () => {
    if (serverIds.length === 0) {
      setActivityMap(new Map());
      return;
    }

    // Get all voice channels for these servers
    const { data: channels } = await supabase
      .from("channels" as any)
      .select("id, server_id")
      .in("server_id", serverIds)
      .eq("type", "voice");

    if (!channels || channels.length === 0) {
      setActivityMap(new Map());
      return;
    }

    const channelIds = (channels as any[]).map((c) => c.id);

    // Get all voice participants in these channels
    const { data: participants } = await supabase
      .from("voice_channel_participants" as any)
      .select("channel_id, is_screen_sharing")
      .in("channel_id", channelIds);

    // Build server -> activity mapping
    const channelToServer = new Map<string, string>();
    (channels as any[]).forEach((c) => channelToServer.set(c.id, c.server_id));

    const newActivity = new Map<string, VoiceActivity>();

    ((participants as any[]) || []).forEach((p) => {
      const serverId = channelToServer.get(p.channel_id);
      if (!serverId) return;
      const existing = newActivity.get(serverId) || { hasVoice: false, hasScreenShare: false };
      existing.hasVoice = true;
      if (p.is_screen_sharing) existing.hasScreenShare = true;
      newActivity.set(serverId, existing);
    });

    setActivityMap(newActivity);
  }, [serverIds.join(",")]);

  useEffect(() => {
    computeActivity();

    const channel = supabase
      .channel("server-voice-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants" }, () => {
        computeActivity();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [computeActivity]);

  return activityMap;
}
