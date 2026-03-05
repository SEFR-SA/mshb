import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useReportMessage } from "@/hooks/useReportMessage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

/* ─── Category & Subcategory Data ─── */

interface ReportCategory {
  id: string;
  labelKey: string;
  terminal?: boolean;
  multiSelect?: boolean;
  subcategories?: { id: string; labelKey: string }[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  { id: "dislike", labelKey: "report.catDislike", terminal: true },
  { id: "spam", labelKey: "report.catSpam", terminal: true },
  {
    id: "abuse",
    labelKey: "report.catAbuse",
    subcategories: [
      { id: "verbal_harassment", labelKey: "report.subVerbalHarassment" },
      { id: "vulgar_language", labelKey: "report.subVulgarLanguage" },
      { id: "hate_identity", labelKey: "report.subHateIdentity" },
      { id: "sexual_content", labelKey: "report.subSexualContent" },
      { id: "threatening_violence", labelKey: "report.subThreateningViolence" },
      { id: "targeting_minor", labelKey: "report.subTargetingMinor" },
    ],
  },
  {
    id: "misinformation",
    labelKey: "report.catMisinformation",
    subcategories: [
      { id: "spreading_misinfo", labelKey: "report.subSpreadingMisinfo" },
      { id: "glorifying_violence", labelKey: "report.subGlorifyingViolence" },
      { id: "hate_identity_2", labelKey: "report.subHateIdentity" },
    ],
  },
  {
    id: "private_info",
    labelKey: "report.catPrivateInfo",
    multiSelect: true,
    subcategories: [
      { id: "face_pic", labelKey: "report.subFacePic" },
      { id: "intimate_photo", labelKey: "report.subIntimatePhoto" },
      { id: "ip_address", labelKey: "report.subIpAddress" },
      { id: "legal_name", labelKey: "report.subLegalName" },
      { id: "credit_card", labelKey: "report.subCreditCard" },
      { id: "email_address", labelKey: "report.subEmailAddress" },
      { id: "phone_number", labelKey: "report.subPhoneNumber" },
      { id: "home_address", labelKey: "report.subHomeAddress" },
    ],
  },
  {
    id: "something_else",
    labelKey: "report.catSomethingElse",
    subcategories: [
      { id: "too_young", labelKey: "report.subTooYoung" },
      { id: "self_harm", labelKey: "report.subSelfHarm" },
      { id: "harmful_misinfo", labelKey: "report.subHarmfulMisinfo" },
      { id: "impersonation", labelKey: "report.subImpersonation" },
      { id: "stolen_accounts", labelKey: "report.subStolenAccounts" },
      { id: "illegal_goods", labelKey: "report.subIllegalGoods" },
      { id: "hacks_phishing", labelKey: "report.subHacksPhishing" },
    ],
  },
];

const ReportMessageModal = () => {
  const { t } = useTranslation();
  const { isOpen, reportMessageId, reportSenderName, closeReportModal } = useReportModal();
  const { submitReport, isSubmitting } = useReportMessage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedSubcategories([]);
      setNotes("");
    }
  }, [isOpen]);

  const handleCategoryClick = (cat: ReportCategory) => {
    setSelectedCategory(cat);
    if (cat.terminal) {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleSubcategoryClick = (subId: string) => {
    setSelectedSubcategories([subId]);
    setStep(3);
  };

  const handleMultiSelectToggle = (subId: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]
    );
  };

  const handleBack = () => {
    if (step === 3 && selectedCategory && !selectedCategory.terminal) {
      setSelectedSubcategories([]);
      setStep(2);
    } else {
      setSelectedCategory(null);
      setSelectedSubcategories([]);
      setStep(1);
    }
  };

  const handleSubmit = () => {
    if (!reportMessageId || !selectedCategory) return;
    submitReport({
      messageId: reportMessageId,
      category: selectedCategory.id,
      subcategories: selectedSubcategories,
      notes,
    });
  };

  const getSelectedLabels = (): string[] => {
    if (!selectedCategory) return [];
    if (selectedCategory.terminal) return [t(selectedCategory.labelKey)];
    return selectedSubcategories.map((subId) => {
      const sub = selectedCategory.subcategories?.find((s) => s.id === subId);
      return sub ? t(sub.labelKey) : subId;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeReportModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={handleBack} className="p-1 rounded-md hover:bg-accent transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {step === 1 && (
              <span>
                {t("report.title")}
                {reportSenderName && (
                  <span className="text-muted-foreground font-normal text-sm ms-1">
                    {t("report.fromUser", { name: reportSenderName })}
                  </span>
                )}
              </span>
            )}
            {step === 2 && selectedCategory && <span>{t(selectedCategory.labelKey)}</span>}
            {step === 3 && <span>{t("report.reviewTitle")}</span>}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && t("report.selectReason")}
            {step === 2 && selectedCategory?.multiSelect && t("report.selectAllApply")}
            {step === 2 && !selectedCategory?.multiSelect && t("report.selectSubReason")}
            {step === 3 && (
              <>
                {t("report.fromUser", { name: reportSenderName || "User" })}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {/* ─── Step 1: Category list ─── */}
          {step === 1 &&
            REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm text-start hover:bg-accent transition-colors"
              >
                <span>{t(cat.labelKey)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}

          {/* ─── Step 2: Subcategory list ─── */}
          {step === 2 && selectedCategory && !selectedCategory.multiSelect &&
            selectedCategory.subcategories?.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubcategoryClick(sub.id)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm text-start hover:bg-accent transition-colors"
              >
                <span>{t(sub.labelKey)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}

          {/* ─── Step 2: Multi-select (checkboxes) ─── */}
          {step === 2 && selectedCategory?.multiSelect &&
            <>
              {selectedCategory.subcategories?.map((sub) => (
                <label
                  key={sub.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-accent transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={selectedSubcategories.includes(sub.id)}
                    onCheckedChange={() => handleMultiSelectToggle(sub.id)}
                  />
                  <span>{t(sub.labelKey)}</span>
                </label>
              ))}
              <div className="pt-2">
                <Button
                  className="w-full"
                  disabled={selectedSubcategories.length === 0}
                  onClick={() => setStep(3)}
                >
                  {t("report.continue")}
                </Button>
              </div>
            </>
          }

          {/* ─── Step 3: Summary & Submit ─── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("report.selectedReasons")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory && (
                    <Badge variant="secondary">{t(selectedCategory.labelKey)}</Badge>
                  )}
                  {getSelectedLabels().map((label, i) => (
                    <Badge key={i} variant="outline">{label}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("report.additionalContext")}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("report.notesPlaceholder")}
                  rows={3}
                />
              </div>

              <Button className="w-full" variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("report.submitReport")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportMessageModal;
