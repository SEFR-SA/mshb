import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import i18n from "@/i18n";

const playNotificationSound = () => {
  try {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

export function usePendingFriendRequests() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  const compute = async () => {
    if (!user) { setPendingCount(0); return; }
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    const newCount = count || 0;

    if (prevCountRef.current !== null && newCount > prevCountRef.current) {
      playNotificationSound();
      toast({ title: i18n.t("notifications.newFriendRequest") });
    }
    prevCountRef.current = newCount;

    setPendingCount(newCount);
  };

  useEffect(() => {
    compute();
    const channel = supabase
      .channel("pending-friend-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        compute();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  return { pendingCount };
}
