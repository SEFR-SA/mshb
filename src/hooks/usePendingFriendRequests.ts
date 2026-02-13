import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePendingFriendRequests() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const compute = async () => {
    if (!user) { setPendingCount(0); return; }
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
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
