import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { PROFILE_EFFECTS } from "@/lib/profileEffects";

const EffectSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentEffect = (profile as any)?.profile_effect_url ?? null;

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ profile_effect_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.effectApplied", "Profile effect applied!") : t("profile.effectRemoved", "Profile effect removed.") });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
          {t("profile.profileEffect", "Profile Effect")}
        </h3>
        {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("profile.profileEffectDescription", "Choose an animated effect that plays over your profile card.")}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {/* Remove option */}
        <button
          onClick={() => handleSelect(null)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            !currentEffect ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          } ${!isPro ? "opacity-50" : ""}`}
        >
          <div className="w-full aspect-[3/4] rounded bg-muted/40 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">{t("common.none", "None")}</span>
          </div>
        </button>

        {PROFILE_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => handleSelect(effect.url)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
              currentEffect === effect.url ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            } ${!isPro ? "opacity-50" : ""}`}
          >
            <div className="w-full aspect-[3/4] rounded overflow-hidden relative bg-muted/20">
              <img src={effect.url} alt={effect.name} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <span className="text-[10px] text-muted-foreground truncate max-w-full">{effect.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EffectSelector;
