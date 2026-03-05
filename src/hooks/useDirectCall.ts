import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDirectCall = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const directCall = useCallback(async (targetUserId: string) => {
    if (!user) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();

    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (!newThread) return;
      threadId = newThread.id;
    }
    navigate(`/chat/${threadId}?call=true`);
  }, [user, navigate]);

  return { directCall };
};
