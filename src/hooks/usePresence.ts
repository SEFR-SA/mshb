import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  [userId: string]: { online: boolean; lastSeen?: string };
}

export function usePresence() {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<PresenceState>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map: PresenceState = {};
        Object.entries(state).forEach(([key, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            map[key] = { online: true };
          }
        });
        setPresenceMap(map);
      })
      .on("presence", { event: "join" }, ({ key }: { key: string }) => {
        setPresenceMap((prev) => ({ ...prev, [key]: { online: true } }));
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        setPresenceMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          // Update last_seen immediately on connect
          supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id).then();
        }
      });

    channelRef.current = channel;

    // Update last_seen periodically
    const interval = setInterval(() => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id).then();
    }, 60000);

    return () => {
      clearInterval(interval);
      channel.untrack();
      channel.unsubscribe();
    };
  }, [user]);

  const isOnline = (userId: string) => presenceMap[userId]?.online ?? false;
  const getUserStatus = (profile: any): string => {
    if (!profile) return "offline";
    if (profile.status === "invisible") return "invisible";
    if (isOnline(profile.user_id)) return profile.status || "online";
    return "offline";
  };

  return { presenceMap, isOnline, getUserStatus };
}
