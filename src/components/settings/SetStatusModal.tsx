import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";

const DURATIONS = [
{ id: "1h", label: "1 Hour", minutes: 60 },
{ id: "4h", label: "4 Hours", minutes: 240 },
{ id: "24h", label: "24 Hours", minutes: 1440 },
{ id: "never", label: "Don't Clear", minutes: null as null }];

const DEFAULT_DURATION = "24h";

interface Props {
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const SetStatusModal = ({ onClose, onSaved }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const p = profile as any;
  const isPro = p?.is_pro ?? false;

  const [localText, setLocalText] = useState<string>(profile?.status_text || "");
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
  const [saving, setSaving] = useState(false);

  const initials = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();

  const expiryLabel = useMemo(() => {
    const dur = DURATIONS.find((d) => d.id === selectedDuration);
    if (!dur || dur.minutes === null) return t("setStatus.neverClear");
    const expiry = new Date(Date.now() + dur.minutes * 60000);
    const timeStr = expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isToday = expiry.toDateString() === new Date().toDateString();
    return isToday ?
    t("setStatus.clearTodayAt", { time: timeStr }) :
    t("setStatus.clearTomorrowAt", { time: timeStr });
  }, [selectedDuration, t]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const dur = DURATIONS.find((d) => d.id === selectedDuration);
    const until = dur?.minutes ? new Date(Date.now() + dur.minutes * 60000).toISOString() : null;
    await supabase.from("profiles").update({
      status_text: localText.trim() || null,
      status_until: until
    } as any).eq("user_id", user.id);
    setSaving(false);
    await onSaved();
  };

  const nameStyleProps = {
    displayName: profile?.display_name || profile?.username || "User",
    fontStyle: p?.name_font,
    effect: p?.name_effect,
    gradientStart: p?.name_gradient_start || null,
    gradientEnd: p?.name_gradient_end || null,
    color: p?.name_effect && p.name_effect !== "Gradient" ? p.name_gradient_start : null
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-base font-bold">{t("setStatus.title")}</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors">
            
            
          </button>
        </div>

        {/* Mini Profile Card Preview */}
        <div className="rounded-xl overflow-hidden border border-border/50 mx-4 mt-4">
          <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={isPro}>
            {p?.banner_url ?
            <img src={p.banner_url} alt="" className="h-16 w-full object-cover" /> :
            <div className="h-16 w-full bg-gradient-to-r from-primary/30 to-primary/10" />}
          </ProfileEffectWrapper>

          <div className="px-3 pb-3 pt-0">
            <div className="-mt-6 mb-2 flex items-end gap-2">
              <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={isPro} size={40} className="shrink-0">
                <Avatar className="h-10 w-10 border-4 border-background">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-base">{initials}</AvatarFallback>
                </Avatar>
              </AvatarDecorationWrapper>
              <StatusBubble statusText={localText || null} />
            </div>
            <StyledDisplayName {...nameStyleProps} className="font-bold text-sm" />
            {profile?.username &&
            <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
            }
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("setStatus.label")}
            </Label>
            <Input
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder={t("setStatus.placeholder")}
              className="bg-muted/40"
              maxLength={100} />
            
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger className="bg-muted/40 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {DURATIONS.map((d) =>
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{expiryLabel}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-3 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("setStatus.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

};

export default SetStatusModal;