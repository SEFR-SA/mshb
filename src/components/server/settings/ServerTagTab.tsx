import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star, Flame, Zap, Shield, Crown, Award, Gem, Rocket, Music, Heart, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  serverId: string;
  canEdit: boolean;
}

const BADGE_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Star", Icon: Star },
  { name: "Flame", Icon: Flame },
  { name: "Zap", Icon: Zap },
  { name: "Shield", Icon: Shield },
  { name: "Crown", Icon: Crown },
  { name: "Award", Icon: Award },
  { name: "Gem", Icon: Gem },
  { name: "Rocket", Icon: Rocket },
  { name: "Music", Icon: Music },
  { name: "Heart", Icon: Heart },
];

const PRESET_COLORS = [
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ea580c",
  "#db2777",
  "#0d9488",
  "#ca8a04",
];

const DEFAULT_COLOR = "#7c3aed";
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const ServerTagTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tagName, setTagName] = useState("");
  const [tagBadge, setTagBadge] = useState("Star");
  const [tagColor, setTagColor] = useState(DEFAULT_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_COLOR);

  useEffect(() => {
    if (!serverId) return;
    const load = async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("servers" as any)
        .select("server_tag_name, server_tag_badge, server_tag_color")
        .eq("id", serverId)
        .maybeSingle();

      if (s) {
        setTagName((s as any).server_tag_name ?? "");
        setTagBadge((s as any).server_tag_badge ?? "Star");
        const color = (s as any).server_tag_color ?? DEFAULT_COLOR;
        setTagColor(color);
        setHexInput(color);
      }
      setLoading(false);
    };
    load();
  }, [serverId]);

  const handleColorSelect = (color: string) => {
    setTagColor(color);
    setHexInput(color);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (HEX_REGEX.test(val)) {
      setTagColor(val);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("servers" as any)
        .update({
          server_tag_name: tagName.trim() || null,
          server_tag_badge: tagBadge,
          server_tag_color: tagColor,
        } as any)
        .eq("id", serverId);

      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const ActiveBadgeIcon = BADGE_OPTIONS.find((b) => b.name === tagBadge)?.Icon ?? Star;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("serverSettings.serverTag")}</h2>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("serverSettings.serverTagPreview")}
        </p>
        <p className="text-xs text-muted-foreground">{t("serverSettings.serverTagPreviewDesc")}</p>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 w-fit">
          {/* Mock user avatar */}
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            U
          </div>
          <span className="text-sm font-medium">Username</span>
          {/* Tag pill */}
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold leading-none text-white shrink-0"
            style={{ backgroundColor: tagColor }}
          >
            <ActiveBadgeIcon className="h-2.5 w-2.5" />
            {(tagName || t("serverSettings.serverTag")).substring(0, 4).toUpperCase()}
          </span>
        </div>
      </div>

      <Separator />

      {/* Section 1 — Choose Name */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("serverSettings.serverTagName")}
        </p>
        <Input
          value={tagName}
          onChange={(e) => setTagName(e.target.value.toUpperCase())}
          placeholder={t("serverSettings.serverTagNamePlaceholder")}
          disabled={!canEdit}
          maxLength={4}
          className="max-w-xs uppercase"
        />
      </div>

      <Separator />

      {/* Section 2 — Choose Badge */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("serverSettings.serverTagBadge")}
        </p>
        <div className="grid grid-cols-5 gap-2 max-w-xs">
          {BADGE_OPTIONS.map(({ name, Icon }) => (
            <button
              key={name}
              onClick={() => canEdit && setTagBadge(name)}
              disabled={!canEdit}
              className={cn(
                "h-10 w-10 rounded-md flex items-center justify-center transition-colors",
                "bg-muted/50 hover:bg-muted",
                tagBadge === name && "ring-2 ring-primary bg-primary/10"
              )}
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 3 — Choose Color */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("serverSettings.serverTagColor")}
        </p>

        {/* Preset swatches */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => canEdit && handleColorSelect(color)}
              disabled={!canEdit}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                tagColor === color && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom hex input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">
            {t("serverSettings.serverTagHexColor")}
          </Label>
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-md border border-border shrink-0"
              style={{ backgroundColor: HEX_REGEX.test(hexInput) ? hexInput : tagColor }}
            />
            <Input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              disabled={!canEdit}
              placeholder="#7c3aed"
              maxLength={7}
              className="w-28 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t("actions.save")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServerTagTab;
