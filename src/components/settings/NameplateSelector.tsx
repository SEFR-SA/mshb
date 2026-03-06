import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock, ChevronRight } from "lucide-react";
import { NAMEPLATES } from "@/lib/nameplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const NameplateSelector = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const currentNameplate = (profile as any)?.nameplate_url ?? null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentName = NAMEPLATES.find((n) => n.url === currentNameplate)?.name ?? t("common.none", "None");
  const filtered = NAMEPLATES.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (url: string | null) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ nameplate_url: url } as any).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: url ? t("profile.nameplateApplied", "Nameplate applied!") : t("profile.nameplateRemoved", "Nameplate removed.") });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {currentNameplate ? (
            <img src={currentNameplate} alt="" className="h-8 w-16 object-cover rounded" />
          ) : (
            <div className="h-8 w-16 rounded bg-muted/40 flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground">{t("common.none", "None")}</span>
            </div>
          )}
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">{t("profile.nameplateBanner", "Nameplate Banner")}</p>
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
            <DialogTitle>{t("profile.nameplateBanner", "Nameplate Banner")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {/* None option */}
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

            {filtered.map((np) => (
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NameplateSelector;
