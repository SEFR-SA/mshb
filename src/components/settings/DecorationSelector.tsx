import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Lock, ChevronRight } from "lucide-react";
import { DECORATIONS } from "@/lib/decorations";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const DecorationSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentDecoration = (profile as any)?.avatar_decoration_url ?? null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentName = DECORATIONS.find((d) => d.url === currentDecoration)?.name ?? t("common.none", "None");
  const filtered = DECORATIONS.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ avatar_decoration_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.decorationApplied", "Decoration applied!") : t("profile.decorationRemoved", "Decoration removed.") });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AvatarDecorationWrapper decorationUrl={currentDecoration} isPro={isPro} size={32}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {(profile?.display_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </AvatarDecorationWrapper>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">{t("profile.avatarDecoration", "Avatar Decoration")}</p>
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
            <DialogTitle>{t("profile.avatarDecoration", "Avatar Decoration")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {/* None option */}
            <button
              onClick={() => handleSelect(null)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                !currentDecoration ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              } ${!isPro ? "opacity-50" : ""}`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {(profile?.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground">{t("common.none", "None")}</span>
            </button>

            {filtered.map((dec) => (
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DecorationSelector;
