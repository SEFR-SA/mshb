import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type TimeFormat = "12h" | "24h";

const LANGUAGES = [
  {
    code: "en" as const,
    label: "English",
    nativeLabel: "English",
    flagUrl: "https://flagcdn.com/w40/gb.png",
  },
  {
    code: "ar" as const,
    label: "Arabic",
    nativeLabel: "العربية",
    flagUrl: "https://flagcdn.com/w40/sa.png",
  },
];

const LanguageTab = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");

  useEffect(() => {
    const stored = localStorage.getItem("mshb_time_format") as TimeFormat | null;
    if (stored) setTimeFormat(stored);
  }, []);

  const switchLanguage = async (lang: "en" | "ar") => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (user) {
      await supabase.from("profiles").update({ language: lang } as any).eq("user_id", user.id);
    }
  };

  const switchTimeFormat = (fmt: TimeFormat) => {
    setTimeFormat(fmt);
    localStorage.setItem("mshb_time_format", fmt);
  };

  const currentLang = i18n.language.split("-")[0] as "en" | "ar";
  const currentLangData = LANGUAGES.find((l) => l.code === currentLang) ?? LANGUAGES[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.languageTime")}</h2>
        <p className="text-sm text-muted-foreground">Set your preferred language and time format.</p>
      </div>

      {/* Language — dropdown */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {t("settings.selectLanguage")}
        </h3>
        <Select value={currentLang} onValueChange={(v) => switchLanguage(v as "en" | "ar")}>
          <SelectTrigger className="bg-background h-11">
            {/* Custom trigger display: flag image + label */}
            <div className="flex items-center gap-2.5">
              <img
                src={currentLangData.flagUrl}
                alt={currentLangData.code}
                className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
              />
              <span className="font-medium">{currentLangData.label}</span>
              <span className="text-muted-foreground text-xs">({currentLangData.nativeLabel})</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2.5 py-0.5">
                  <img
                    src={lang.flagUrl}
                    alt={lang.code}
                    className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                  />
                  <span className="font-medium">{lang.label}</span>
                  <span className="text-muted-foreground text-xs">({lang.nativeLabel})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Format */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {t("settings.timeFormat")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(["12h", "24h"] as TimeFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => switchTimeFormat(fmt)}
              className={cn(
                "rounded-xl border-2 p-4 text-start transition-all hover:border-primary/50",
                timeFormat === fmt ? "border-primary bg-primary/5" : "border-border bg-muted/10"
              )}
            >
              <p className="font-semibold">{t(`settings.time${fmt}`)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt === "12h" ? "3:30 PM" : "15:30"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageTab;
