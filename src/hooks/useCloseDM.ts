import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const useCloseDM = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const closeDM = useCallback(async (threadId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("dm_thread_visibility")
      .upsert(
        { thread_id: threadId, user_id: user.id, is_visible: false, closed_at: new Date().toISOString() } as any,
        { onConflict: "thread_id,user_id" }
      );
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("common.dmClosed", "DM closed") });
    }
  }, [user, t]);

  return { closeDM };
};
