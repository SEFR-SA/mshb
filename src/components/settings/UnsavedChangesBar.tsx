import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface UnsavedChangesBarProps {
  show: boolean;
  onSave?: () => void;
  onReset?: () => void;
  shakeTrigger?: number;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({ show, onSave, onReset, shakeTrigger }) => {
  const { t } = useTranslation();
  const [isShaking, setShaking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (shakeTrigger) {
      setShaking(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShaking(false), 500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [shakeTrigger]);

  if (!show) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className={`max-w-3xl mx-auto flex items-center justify-between p-3 px-4 bg-[#111214] border border-border/50 rounded-xl shadow-2xl transition-colors duration-300 ${isShaking ? "bg-destructive/20 border-destructive animate-shake" : ""}`}>
        <p className="text-sm font-medium text-white">{t("settings.unsavedChanges", "Careful — you have unsaved changes!")}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-white hover:bg-white/10">{t("common.reset", "Reset")}</Button>
          <Button size="sm" onClick={onSave} className="text-white hover:opacity-90" style={{ backgroundColor: "var(--color-primary, hsl(var(--primary)))" }}>{t("common.saveChanges", "Save Changes")}</Button>
        </div>
      </div>
    </div>
  );
};
