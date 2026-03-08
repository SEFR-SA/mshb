import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dices, Lock, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_STYLES, EFFECT_OPTIONS, COLOR_SWATCHES, type FontStyle, type NameEffect } from "@/config/nameStyles";
import StyledDisplayName from "@/components/StyledDisplayName";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";

interface Props {
  onClose: () => void;
  onApplied: () => Promise<void>;
}

const DisplayNameStyleModal = ({ onClose, onApplied }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const p = profile as any;
  const isPro = p?.is_pro ?? false;

  const [localFont, setLocalFont]       = useState<FontStyle>((p?.name_font as FontStyle) || "Normal");
  const [localEffect, setLocalEffect]   = useState<NameEffect>((p?.name_effect as NameEffect) || "Solid");
  const [localColorA, setLocalColorA]   = useState<string>(p?.name_gradient_start || "#FFFFFF");
  const [localColorB, setLocalColorB]   = useState<string>(p?.name_gradient_end   || "#FF8800");
  const [pickingSlot, setPickingSlot]   = useState<"A" | "B">("A");
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [saving, setSaving]             = useState(false);

  const displayName = profile?.display_name || profile?.username || "User";
  const initials    = displayName.charAt(0).toUpperCase();

  const proBlock = (fn: () => void) => () => {
    if (!isPro) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });
      return;
    }
    fn();
  };

  const handleSurpriseMe = proBlock(() => {
    setLocalFont(FONT_STYLES[Math.floor(Math.random() * FONT_STYLES.length)].id);
    setLocalEffect(EFFECT_OPTIONS[Math.floor(Math.random() * EFFECT_OPTIONS.length)].id);
    const a = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
    const b = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
    setLocalColorA(a);
    setLocalColorB(b);
  });

  const handleApply = async () => {
    if (!user) return;
    setSaving(true);
    const gradientEnd = localEffect === "Gradient" ? localColorB : null;
    await supabase.from("profiles").update({
      name_font:           localFont === "Normal" ? null : localFont,
      name_effect:         localEffect,
      name_gradient_start: localColorA,
      name_gradient_end:   gradientEnd,
      display_name:        profile?.display_name || "",
    } as any).eq("user_id", user.id);
    setSaving(false);
    await onApplied();
  };

  const activeColor = localColorA;

  // Effect preview style for the effect selector buttons
  const effectLabelStyle = (id: NameEffect): React.CSSProperties => {
    if (id === "Gradient") return {
      backgroundImage: `linear-gradient(90deg, ${localColorA}, ${localColorB})`,
      WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
    };
    if (id === "Neon") return { color: localColorA, textShadow: `0 0 8px ${localColorA}, 0 0 20px ${localColorA}` };
    if (id === "Toon") return { color: localColorA, textShadow: `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000` };
    if (id === "Pop")  return { color: localColorA, textShadow: `2px 2px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(0,0,0,0.15)` };
    return { color: localColorA };
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{children}</span>
      {!isPro && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
    </div>
  );

  const ColorGrid = ({ slot }: { slot: "A" | "B" }) => {
    const active = slot === "A" ? localColorA : localColorB;
    const setColor = slot === "A" ? setLocalColorA : setLocalColorB;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              onClick={proBlock(() => { setPickingSlot(slot); setColor(hex); })}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                active === hex ? "border-primary scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border border-border shrink-0" style={{ backgroundColor: active }} />
          <input
            type="text"
            value={active}
            onChange={(e) => { if (isPro) setColor(e.target.value); else toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") }); }}
            className="flex-1 h-7 px-2 text-xs rounded-md bg-muted/40 border border-border/50 font-mono"
            maxLength={7}
          />
          <input
            type="color"
            value={active}
            onChange={(e) => { if (isPro) setColor(e.target.value); else toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") }); }}
            className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent"
            title="Pick custom color"
          />
        </div>
      </div>
    );
  };

  const isDark = previewTheme === "dark";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={cn("p-0 flex flex-col overflow-hidden gap-0", isMobile ? "w-full max-w-full" : "w-[900px] max-w-[95vw] max-h-[90vh]")}>
        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ── Left Pane ── */}
          <div className="w-[380px] shrink-0 overflow-y-auto p-6 flex flex-col gap-6 border-e border-border/50">
            <h2 className="text-base font-bold">{t("nameStyle.title")}</h2>

            {/* Font Grid */}
            <div className="space-y-3">
              <SectionLabel>{t("nameStyle.chooseFont")}</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {FONT_STYLES.map((font) => (
                  <button
                    key={font.id}
                    onClick={proBlock(() => setLocalFont(font.id))}
                    className={cn(
                      "h-16 w-full rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center",
                      !isPro && "opacity-50 cursor-not-allowed",
                      localFont === font.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/40 hover:border-primary/50"
                    )}
                    title={font.label}
                  >
                    <span style={{ fontFamily: font.family }}>{font.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Effect Selector */}
            <div className="space-y-3">
              <SectionLabel>{t("nameStyle.chooseEffect")}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {EFFECT_OPTIONS.map((eff) => (
                  <button
                    key={eff.id}
                    onClick={proBlock(() => setLocalEffect(eff.id))}
                    className={cn(
                      "px-3 py-1.5 rounded-md border-2 text-sm font-semibold transition-colors",
                      !isPro && "opacity-50 cursor-not-allowed",
                      localEffect === eff.id
                        ? "border-primary bg-primary/15"
                        : "border-border/40 hover:border-primary/50"
                    )}
                  >
                    <span style={effectLabelStyle(eff.id)}>{eff.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-3">
              <SectionLabel>{t("nameStyle.chooseColor")}</SectionLabel>
              {localEffect === "Gradient" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{t("nameStyle.fromColor")}</p>
                    <ColorGrid slot="A" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{t("nameStyle.toColor")}</p>
                    <ColorGrid slot="B" />
                  </div>
                </div>
              ) : (
                <ColorGrid slot="A" />
              )}
            </div>
          </div>

          {/* ── Right Pane (Preview) ── */}
          <div className={cn("flex-1 flex flex-col relative", isDark ? "bg-zinc-900 text-white" : "bg-gray-100 text-gray-900")}>
            {/* Theme toggle */}
            <button
              onClick={() => setPreviewTheme(isDark ? "light" : "dark")}
              className="absolute bottom-4 end-4 z-10 h-8 w-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
              title={isDark ? "Switch to light preview" : "Switch to dark preview"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="flex-1 overflow-y-auto flex flex-col gap-6 p-6 justify-center">
              <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-50 text-center">{t("nameStyle.previewTitle")}</p>

              {/* Profile Card Mock */}
              <div className={cn("rounded-xl overflow-hidden border shadow-lg mx-auto w-full max-w-[300px]", isDark ? "border-white/10 bg-zinc-800" : "border-gray-300 bg-white")}>
                <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={isPro}>
                  <NameplateWrapper nameplateUrl={p?.nameplate_url} isPro={isPro} className="rounded-t-xl">
                    {/* Banner — hide gradient placeholder when nameplate is providing the background */}
                    {p?.banner_url ? (
                      <img src={p.banner_url} alt="" className="h-24 w-full object-cover" />
                    ) : !(p?.nameplate_url && isPro) ? (
                      <div className="h-24 w-full bg-gradient-to-r from-primary/40 to-primary/20" />
                    ) : (
                      <div className="h-24 w-full" />
                    )}
                  </NameplateWrapper>

                  <div className="px-4 pb-4 pt-0 relative">
                    {/* Avatar overlapping banner */}
                    <div className="-mt-10 mb-2">
                      <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={isPro} size={80} className="inline-block">
                        <Avatar className="h-20 w-20 border-4" style={{ borderColor: isDark ? "#27272a" : "#ffffff" }}>
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">{initials}</AvatarFallback>
                        </Avatar>
                      </AvatarDecorationWrapper>
                    </div>
                    <StyledDisplayName
                      displayName={displayName}
                      fontStyle={localFont}
                      effect={localEffect}
                      gradientStart={localColorA}
                      gradientEnd={localEffect === "Gradient" ? localColorB : null}
                      color={localEffect !== "Gradient" ? localColorA : null}
                      className="font-bold text-base"
                    />
                    {profile?.username && (
                      <p className="text-xs opacity-60 mt-0.5">@{profile.username}</p>
                    )}
                  </div>
                </ProfileEffectWrapper>
              </div>

              {/* DM Message Mock */}
              <div className={cn("rounded-xl p-4 border mx-auto w-full max-w-[320px]", isDark ? "border-white/10 bg-zinc-800" : "border-gray-300 bg-white")}>
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <StyledDisplayName
                      displayName={displayName}
                      fontStyle={localFont}
                      effect={localEffect}
                      gradientStart={localColorA}
                      gradientEnd={localEffect === "Gradient" ? localColorB : null}
                      color={localEffect !== "Gradient" ? localColorA : null}
                      className="font-semibold text-sm leading-none mb-1"
                    />
                    <p className="text-xs opacity-70 mt-1">does anyone read this?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-border/50 flex items-center justify-between px-4 py-3 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSurpriseMe} className="gap-1.5">
            <Dices className="h-4 w-4" />
            {t("nameStyle.surpriseMe")}
          </Button>
          <Button size="sm" onClick={handleApply} disabled={saving || !isPro}>
            {saving ? t("common.loading") : t("nameStyle.apply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisplayNameStyleModal;
