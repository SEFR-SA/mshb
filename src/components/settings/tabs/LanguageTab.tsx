import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TimeFormat = "12h" | "24h";

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.languageTime")}</h2>
        <p className="text-sm text-muted-foreground">Set your preferred language and time format.</p>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.selectLanguage")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* English */}
          <button
            onClick={() => switchLanguage("en")}
            className={cn(
              "rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:border-primary/50",
              currentLang === "en" ? "border-primary bg-primary/5" : "border-border bg-muted/10"
            )}
          >
            <span className="text-3xl">🇬🇧</span>
            <div className="text-start">
              <p className="font-semibold">{t("settings.english")}</p>
              <p className="text-xs text-muted-foreground">English</p>
            </div>
            {currentLang === "en" && (
              <div className="ms-auto h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </div>
            )}
          </button>

          {/* Arabic */}
          <button
            onClick={() => switchLanguage("ar")}
            className={cn(
              "rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:border-primary/50",
              currentLang === "ar" ? "border-primary bg-primary/5" : "border-border bg-muted/10"
            )}
          >
            <span className="text-3xl">🇸🇦</span>
            <div className="text-start">
              <p className="font-semibold">{t("settings.arabic")}</p>
              <p className="text-xs text-muted-foreground">العربية</p>
            </div>
            {currentLang === "ar" && (
              <div className="ms-auto h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Time Format */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.timeFormat")}</h3>
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
