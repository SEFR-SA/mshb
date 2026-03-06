import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock, ChevronRight } from "lucide-react";
import { PROFILE_EFFECTS } from "@/lib/profileEffects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const EffectSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentEffect = (profile as any)?.profile_effect_url ?? null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentName = PROFILE_EFFECTS.find((e) => e.url === currentEffect)?.name ?? t("common.none", "None");
  const filtered = PROFILE_EFFECTS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ profile_effect_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.effectApplied", "Profile effect applied!") : t("profile.effectRemoved", "Profile effect removed.") });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {currentEffect ? (
            <img src={currentEffect} alt="" className="h-10 w-8 object-cover rounded" />
          ) : (
            <div className="h-10 w-8 rounded bg-muted/40 flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">{t("common.none", "None")}</span>
            </div>
          )}
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">{t("profile.profileEffect", "Profile Effect")}</p>
            <p className="text-[11px] text-muted-foreground">{currentName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          {!isPro && <Lock className="h-3 w-3" />}
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("profile.profileEffect", "Profile Effect")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {/* None option */}
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

            {filtered.map((effect) => (
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EffectSelector;
