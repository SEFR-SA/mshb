import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { NAMEPLATES } from "@/lib/nameplates";

const NameplateSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentNameplate = (profile as any)?.nameplate_url ?? null;

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ nameplate_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.nameplateApplied", "Nameplate applied!") : t("profile.nameplateRemoved", "Nameplate removed.") });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
          {t("profile.nameplateBanner", "Nameplate Banner")}
        </h3>
        {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("profile.nameplateDescription", "Choose a nameplate background for your identity rows.")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Remove option */}
        <button
          onClick={() => handleSelect(null)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            !currentNameplate ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          } ${!isPro ? "opacity-50" : ""}`}
        >
          <div className="w-full h-10 rounded bg-muted/40 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">{t("common.none", "None")}</span>
          </div>
        </button>

        {NAMEPLATES.map((np) => (
          <button
            key={np.id}
            onClick={() => handleSelect(np.url)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
              currentNameplate === np.url ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            } ${!isPro ? "opacity-50" : ""}`}
          >
            <img src={np.url} alt={np.name} className="w-full h-10 object-cover rounded" />
            <span className="text-[10px] text-muted-foreground truncate max-w-full">{np.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NameplateSelector;
