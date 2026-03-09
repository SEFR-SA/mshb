import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetProfile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

// ── Step 3: primary reason options ──────────────────────────────────────────
const PRIMARY_REASONS = [
  { value: "spam",          labelKey: "report.catSpam" },
  { value: "abuse",         labelKey: "report.catAbuse" },
  { value: "hate",          labelKey: "report.catHateSpeech" },
  { value: "impersonation", labelKey: "report.catImpersonation" },
  { value: "something_else",labelKey: "report.catSomethingElse" },
];

// ── Step 4: sub-reason options per primary reason ─────────────────────────
const SUB_REASONS: Record<string, { value: string; labelKey: string }[]> = {
  abuse: [
    { value: "hate_identity",        labelKey: "report.subHateIdentity" },
    { value: "sexual_content",       labelKey: "report.subSexualContent" },
    { value: "threatening_violence", labelKey: "report.subThreateningViolence" },
    { value: "targeting_minor",      labelKey: "report.subTargetingMinor" },
  ],
  hate: [
    { value: "glorifying_violence",  labelKey: "report.subGlorifyingViolence" },
    { value: "hate_identity",        labelKey: "report.subHateIdentity" },
  ],
  impersonation: [
    { value: "staff",                labelKey: "report.subStaff" },
    { value: "someone_i_know",       labelKey: "report.subSomeoneIKnow" },
    { value: "celebrity",            labelKey: "report.subCelebrity" },
    { value: "business",             labelKey: "report.subBusiness" },
    { value: "scamming",             labelKey: "report.subScamming" },
  ],
  something_else: [
    { value: "too_young",            labelKey: "report.subTooYoung" },
    { value: "self_harm",            labelKey: "report.subSelfHarm" },
    { value: "stolen_accounts",      labelKey: "report.subStolenAccounts" },
    { value: "illegal_goods",        labelKey: "report.subIllegalGoods" },
    { value: "hacks_phishing",       labelKey: "report.subHacksPhishing" },
    { value: "private_info",         labelKey: "report.subPrivateInfo" },
  ],
};

// ── Element options (step 2) ──────────────────────────────────────────────
const ELEMENTS = [
  { value: "photo",  labelKey: "report.user.elemPhoto" },
  { value: "name",   labelKey: "report.user.elemName" },
  { value: "text",   labelKey: "report.user.elemText" },
  { value: "tag",    labelKey: "report.user.elemTag" },
];

// ── Framer-motion variants ─────────────────────────────────────────────────
const stepVariants = {
  enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
};

const ReportUserDialog = ({ open, onOpenChange, targetUserId, targetProfile }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [step, setStep]             = useState(1);
  const [direction, setDirection]   = useState(1);
  const [elements, setElements]     = useState<string[]>([]);
  const [mainReason, setMainReason] = useState("");
  const [subReason, setSubReason]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const targetName = targetProfile.display_name || targetProfile.username || "User";

  const resetState = () => {
    setStep(1); setDirection(1);
    setElements([]); setMainReason(""); setSubReason("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  const goNext = () => {
    const nextStep = step === 3 && mainReason === "spam" ? 5 : step + 1;
    setDirection(1);
    setStep(nextStep);
  };

  const goBack = () => {
    const prevStep = step === 5 && mainReason === "spam" ? 3 : step - 1;
    setDirection(-1);
    setStep(prevStep);
  };

  const toggleElement = (val: string) => {
    setElements((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("profiles_reports" as any).insert({
      reporter_id:       user.id,
      reported_id:       targetUserId,
      reported_elements: elements,
      main_reason:       mainReason,
      sub_reason:        subReason || null,
    } as any);
    if (error) {
      toast({ title: t("report.submitError"), variant: "destructive" });
    } else {
      toast({ title: t("report.submitSuccess") });
      handleOpenChange(false);
    }
    setSubmitting(false);
  };

  // ── Step content renderer ─────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 1: Introduction ────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{t("report.user.intro")}</p>

            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                {t("report.user.targetLabel")}
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {targetProfile.avatar_url && <AvatarImage src={targetProfile.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {targetName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{targetName}</p>
                  {targetProfile.username && (
                    <p className="text-xs text-muted-foreground">@{targetProfile.username}</p>
                  )}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={goNext}>
              {t("report.continue")}
            </Button>
          </div>
        );

      // ── Step 2: Element selection ────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{t("report.user.elementsDesc")}</p>

            <div className="space-y-3">
              {ELEMENTS.map((el) => (
                <label
                  key={el.value}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <Checkbox
                    checked={elements.includes(el.value)}
                    onCheckedChange={() => toggleElement(el.value)}
                  />
                  <span className="text-sm">{t(el.labelKey)}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={goBack}>{t("common.back", "Back")}</Button>
              <Button className="flex-1" disabled={elements.length === 0} onClick={goNext}>
                {t("report.continue")}
              </Button>
            </div>
          </div>
        );

      // ── Step 3: Primary reason ──────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              {PRIMARY_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setMainReason(r.value); setSubReason(""); }}
                  className={`flex items-center w-full text-start rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    mainReason === r.value
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-card hover:bg-accent/40"
                  }`}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={goBack}>{t("common.back", "Back")}</Button>
              <Button className="flex-1" disabled={!mainReason} onClick={goNext}>
                {t("report.continue")}
              </Button>
            </div>
          </div>
        );

      // ── Step 4: Sub-reason ──────────────────────────────────────────────
      case 4: {
        const subs = SUB_REASONS[mainReason] ?? [];
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              {subs.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSubReason(s.value)}
                  className={`flex items-center w-full text-start rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    subReason === s.value
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-card hover:bg-accent/40"
                  }`}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={goBack}>{t("common.back", "Back")}</Button>
              <Button className="flex-1" disabled={!subReason} onClick={goNext}>
                {t("report.continue")}
              </Button>
            </div>
          </div>
        );
      }

      // ── Step 5: Summary ─────────────────────────────────────────────────
      case 5: {
        const mainLabel  = PRIMARY_REASONS.find((r) => r.value === mainReason)?.labelKey ?? "";
        const subOptions = SUB_REASONS[mainReason] ?? [];
        const subLabel   = subOptions.find((s) => s.value === subReason)?.labelKey ?? "";
        const elementLabels = elements.map((e) => t(ELEMENTS.find((el) => el.value === e)?.labelKey ?? ""));

        return (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card divide-y divide-border text-sm">
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {targetProfile.avatar_url && <AvatarImage src={targetProfile.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {targetName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{targetName}</span>
              </div>

              {elementLabels.length > 0 && (
                <div className="px-3 py-2.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">
                    {t("report.user.elementsLabel")}
                  </p>
                  <p>{elementLabels.join(", ")}</p>
                </div>
              )}

              <div className="px-3 py-2.5 space-y-0.5">
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  {t("report.user.reasonLabel")}
                </p>
                <p>{mainLabel ? t(mainLabel) : "—"}</p>
              </div>

              {subLabel && (
                <div className="px-3 py-2.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">
                    {t("report.user.subReasonLabel")}
                  </p>
                  <p>{t(subLabel)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={goBack} disabled={submitting}>
                {t("common.back", "Back")}
              </Button>
              <Button
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t("report.user.menuItem")}
              </Button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const stepTitles: Record<number, string> = {
    1: t("report.user.title"),
    2: t("report.user.elementsTitle"),
    3: t("report.user.reasonTitle"),
    4: t("report.user.subReasonLabel"),
    5: t("report.user.summaryTitle"),
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <DialogTitle>{stepTitles[step]}</DialogTitle>
          </div>
          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-5 bg-primary"
                    : s < step
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserDialog;
