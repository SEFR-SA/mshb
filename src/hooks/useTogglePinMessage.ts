import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const useTogglePinMessage = () => {
  const { t } = useTranslation();

  const togglePin = useCallback(async (messageId: string): Promise<boolean | null> => {
    try {
      const { data, error } = await supabase.rpc("toggle_message_pin" as any, {
        p_message_id: messageId,
      });
      if (error) throw error;
      const newVal = data as boolean;
      toast({ title: newVal ? t("actions.messagePinned") : t("actions.messageUnpinned") });
      return newVal;
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      return null;
    }
  }, [t]);

  return { togglePin };
};
