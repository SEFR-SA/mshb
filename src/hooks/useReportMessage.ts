import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReportModal } from "@/contexts/ReportModalContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ReportPayload {
  messageId: string;
  category: string;
  subcategories: string[];
  notes: string;
}

export const useReportMessage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { closeReportModal } = useReportModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = async ({ messageId, category, subcategories, notes }: ReportPayload) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("message_reports" as any).insert({
        reporter_id: user.id,
        message_id: messageId,
        category,
        subcategories,
        notes,
      });
      if (error) throw error;
      toast({ title: t("report.submitSuccess") });
      closeReportModal();
    } catch (err: any) {
      toast({ title: t("report.submitError"), description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitReport, isSubmitting };
};
