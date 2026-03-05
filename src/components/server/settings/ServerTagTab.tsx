import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Sword, Skull, FlaskConical, Star, Flame, Zap, Shield, Loader2, Lock } from "lucide-react";
import { OrbBadge } from "@/components/ui/badges/OrbBadge";
import { CrownBadge } from "@/components/ui/badges/CrownBadge";
import SwordBadge from "@/components/ui/badges/SwordBadge";
import TwistedMindsBadge from "@/components/ui/badges/TwistedMindsBadge";
import { cn } from "@/lib/utils";
import ServerTagBadgeIcon from "@/components/ServerTagBadgeIcon";

interface Props {
  serverId: string;
  canEdit: boolean;
}

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
const DEFAULT_CONTAINER_COLOR = "#1e293b";
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const BADGE_OPTIONS = [
  { id: "crown",  Icon: CrownBadge,   label: "Crown",  custom: true },
  { id: "sword",  Icon: SwordBadge,   label: "Sword",  custom: true },
  { id: "skull",  Icon: Skull,        label: "Skull"  },
  { id: "potion", Icon: FlaskConical, label: "Potion" },
  { id: "star",   Icon: Star,         label: "Star"   },
  { id: "flame",  Icon: Flame,        label: "Flame"  },
  { id: "zap",    Icon: Zap,          label: "Zap"    },
  { id: "shield", Icon: Shield,       label: "Shield" },
  { id: "orb",    Icon: OrbBadge,     label: "Orb",   custom: true },
  { id: "twistedminds", Icon: TwistedMindsBadge, label: "Twisted Minds", custom: true },
];

const ServerTagTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const isPro = !!profile?.is_pro;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tagName, setTagName] = useState("");
  const [tagBadge, setTagBadge] = useState("crown");
  const [tagColor, setTagColor] = useState(DEFAULT_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_COLOR);
  const [tagContainerColor, setTagContainerColor] = useState(DEFAULT_CONTAINER_COLOR);
  const [containerHexInput, setContainerHexInput] = useState(DEFAULT_CONTAINER_COLOR);

  const badgeColorInputRef = useRef<HTMLInputElement>(null);
  const containerColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!serverId) return;
    const load = async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("servers" as any)
        .select("server_tag_name, server_tag_badge, server_tag_color, server_tag_container_color")
        .eq("id", serverId)
        .maybeSingle();

      if (s) {
        setTagName((s as any).server_tag_name ?? "");
        setTagBadge((s as any).server_tag_badge ?? "crown");
        const badgeColor = (s as any).server_tag_color ?? DEFAULT_COLOR;
        setTagColor(badgeColor);
        setHexInput(badgeColor);
        const containerColor = (s as any).server_tag_container_color ?? (s as any).server_tag_color ?? DEFAULT_CONTAINER_COLOR;
        setTagContainerColor(containerColor);
        setContainerHexInput(containerColor);
      }
      setLoading(false);
    };
    load();
  }, [serverId]);

  const handleBadgeColorSelect = (color: string) => {
    setTagColor(color);
    setHexInput(color);
  };

  const handleBadgeHexChange = (val: string) => {
    setHexInput(val);
    if (HEX_REGEX.test(val)) setTagColor(val);
  };

  const handleContainerColorSelect = (color: string) => {
    setTagContainerColor(color);
    setContainerHexInput(color);
  };

  const handleContainerHexChange = (val: string) => {
    setContainerHexInput(val);
    if (HEX_REGEX.test(val)) setTagContainerColor(val);
  };

  const handleProBlock = () => {
    if (!isPro) {
      toast({ title: t("pro.requiresPro", "Requires Mshb Pro. Upgrade to unlock this feature."), variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("servers" as any)
        .update({
          server_tag_name: tagName.trim() || null,
          server_tag_badge: tagBadge || null,
          server_tag_color: tagColor,
          server_tag_container_color: tagContainerColor,
        } as any)
        .eq("id", serverId);

      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canInteract = canEdit && isPro;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("serverSettings.serverTag")}</h2>
        {!isPro && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Lock className="h-3 w-3" />
            PRO
          </span>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
          {t("serverSettings.serverTagPreview")}
        </p>
        <p className="text-xs text-muted-foreground">{t("serverSettings.serverTagPreviewDesc")}</p>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 w-fit">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            U
          </div>
          <span className="text-sm font-medium">Username</span>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none text-white shrink-0"
            style={{ backgroundColor: tagContainerColor }}
          >
            <ServerTagBadgeIcon badgeName={tagBadge} color={tagColor} className="h-4 w-4" />
            {(tagName || t("serverSettings.serverTag")).substring(0, 4).toUpperCase()}
          </span>
        </div>
      </div>

      <Separator />

      {/* Section 1 — Tag Name */}
      <div className="space-y-2">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
          {t("serverSettings.serverTagName")}
        </p>
        <Input
          value={tagName}
          onChange={(e) => setTagName(e.target.value.toUpperCase())}
          onClick={!canInteract ? handleProBlock : undefined}
          placeholder={t("serverSettings.serverTagNamePlaceholder")}
          disabled={!canInteract}
          maxLength={4}
          className="max-w-xs uppercase"
        />
      </div>

      <Separator />

      {/* Section 2 — Choose Badge */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
          {t("serverSettings.serverTagBadgeSelect")}
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {BADGE_OPTIONS.map(({ id, Icon, label, custom }) => (
            <button
              key={id}
              onClick={() => {
                if (!canInteract) { handleProBlock(); return; }
                setTagBadge(id);
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
                tagBadge === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60",
                !canInteract && "opacity-50 cursor-not-allowed"
              )}
              title={label}
            >
              {custom
                ? <Icon color={tagBadge === id ? tagColor : undefined} className="h-5 w-5" />
                : <Icon className="h-5 w-5" style={tagBadge === id ? { color: tagColor } : undefined} />
              }
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 3 — Badge Color (SVG fill) */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
          {t("serverSettings.serverTagBadgeColor")}
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                if (!canInteract) { handleProBlock(); return; }
                handleBadgeColorSelect(color);
              }}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                tagColor === color && "ring-2 ring-offset-2 ring-primary",
                !canInteract && "opacity-50 cursor-not-allowed"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative h-8 w-8">
            <div
              className={cn(
                "h-8 w-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs font-bold cursor-pointer hover:border-primary transition-colors",
                !canInteract && "opacity-50 cursor-not-allowed"
              )}
              style={!PRESET_COLORS.includes(tagColor) ? { backgroundColor: tagColor } : undefined}
              onClick={() => {
                if (!canInteract) { handleProBlock(); return; }
                badgeColorInputRef.current?.click();
              }}
              title="Custom color"
            >
              {PRESET_COLORS.includes(tagColor) ? "+" : null}
            </div>
            <input
              ref={badgeColorInputRef}
              type="color"
              value={tagColor}
              onChange={(e) => handleBadgeColorSelect(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0"
              disabled={!canInteract}
            />
          </div>
        </div>

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
              onChange={(e) => handleBadgeHexChange(e.target.value)}
              onClick={!canInteract ? handleProBlock : undefined}
              disabled={!canInteract}
              placeholder="#7c3aed"
              maxLength={7}
              className="w-28 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 4 — Background Color (pill container) */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
          {t("serverSettings.serverTagContainerColor")}
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                if (!canInteract) { handleProBlock(); return; }
                handleContainerColorSelect(color);
              }}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                tagContainerColor === color && "ring-2 ring-offset-2 ring-primary",
                !canInteract && "opacity-50 cursor-not-allowed"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative h-8 w-8">
            <div
              className={cn(
                "h-8 w-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs font-bold cursor-pointer hover:border-primary transition-colors",
                !canInteract && "opacity-50 cursor-not-allowed"
              )}
              style={!PRESET_COLORS.includes(tagContainerColor) ? { backgroundColor: tagContainerColor } : undefined}
              onClick={() => {
                if (!canInteract) { handleProBlock(); return; }
                containerColorInputRef.current?.click();
              }}
              title="Custom color"
            >
              {PRESET_COLORS.includes(tagContainerColor) ? "+" : null}
            </div>
            <input
              ref={containerColorInputRef}
              type="color"
              value={tagContainerColor}
              onChange={(e) => handleContainerColorSelect(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0"
              disabled={!canInteract}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">
            {t("serverSettings.serverTagHexColor")}
          </Label>
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-md border border-border shrink-0"
              style={{ backgroundColor: HEX_REGEX.test(containerHexInput) ? containerHexInput : tagContainerColor }}
            />
            <Input
              value={containerHexInput}
              onChange={(e) => handleContainerHexChange(e.target.value)}
              onClick={!canInteract ? handleProBlock : undefined}
              disabled={!canInteract}
              placeholder="#1e293b"
              maxLength={7}
              className="w-28 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="pt-2">
          <Button onClick={canInteract ? handleSave : handleProBlock} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t("actions.save")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServerTagTab;
