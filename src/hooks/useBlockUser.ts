import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const useBlockUser = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchBlocked = async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (data) setBlockedUserIds(new Set(data.map((r: any) => r.blocked_id)));
    };

    fetchBlocked();

    const channel = supabase
      .channel(`blocked-users-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "blocked_users",
        filter: `blocker_id=eq.${user.id}`,
      }, () => fetchBlocked())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  const blockUser = useCallback(async (blockedId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: blockedId } as any);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setBlockedUserIds(prev => new Set(prev).add(blockedId));
      toast({ title: t("common.blocked", "User blocked") });
    }
  }, [user, t]);

  const unblockUser = useCallback(async (blockedId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setBlockedUserIds(prev => { const n = new Set(prev); n.delete(blockedId); return n; });
      toast({ title: t("common.unblocked", "User unblocked") });
    }
  }, [user, t]);

  const isBlocked = useCallback((userId: string) => blockedUserIds.has(userId), [blockedUserIds]);

  return { blockedUserIds, blockUser, unblockUser, isBlocked };
};
