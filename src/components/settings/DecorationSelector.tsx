import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Lock, X } from "lucide-react";
import { DECORATIONS } from "@/lib/decorations";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";

const DecorationSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentDecoration = (profile as any)?.avatar_decoration_url ?? null;

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ avatar_decoration_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.decorationApplied", "Decoration applied!") : t("profile.decorationRemoved", "Decoration removed.") });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
          {t("profile.avatarDecoration", "Avatar Decoration")}
        </h3>
        {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("profile.avatarDecorationDescription", "Choose a decoration to display around your avatar.")}
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {/* Remove decoration option */}
        <button
          onClick={() => handleSelect(null)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
            !currentDecoration ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          } ${!isPro ? "opacity-50" : ""}`}
        >
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {(profile?.display_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-[10px] text-muted-foreground">{t("common.none", "None")}</span>
        </button>

        {DECORATIONS.map((dec) => (
          <button
            key={dec.id}
            onClick={() => handleSelect(dec.url)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
              currentDecoration === dec.url ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            } ${!isPro ? "opacity-50" : ""}`}
          >
            <AvatarDecorationWrapper decorationUrl={dec.url} isPro={true} size={48}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {(profile?.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </AvatarDecorationWrapper>
            <span className="text-[10px] text-muted-foreground truncate max-w-full">{dec.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DecorationSelector;
