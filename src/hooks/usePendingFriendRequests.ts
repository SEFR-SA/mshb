import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/lib/soundManager";

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
      toast({ title: "You have a new friend request!" });
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
