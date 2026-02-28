import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, X, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: FeatureRow[] = [
  { label: "App Themes",         free: "Standard (Light, Dark)",       pro: "Sado, Majls & Gradient" },
  { label: "Profile Badge",      free: false,                          pro: true },
  { label: "Profile Avatar",     free: "Standard image",               pro: "Animated GIF avatars" },
  { label: "Server Tags",        free: "Text tags only",               pro: "Custom image badges" },
  { label: "File Upload Limit",  free: "50 MB",                        pro: "1 GB" },
  { label: "Global Media",       free: "Within server only",           pro: "Server Emojis & Stickers anywhere" },
  { label: "Screen Share",       free: "1080p / 30fps",                pro: "1080p / 60fps & Source Quality" },
  { label: "Audio Quality",      free: "High Fidelity (384 kbps)",     pro: "High Fidelity (384 kbps)" },
  { label: "Role Customization", free: "Colors & Names",               pro: "Custom Role Icons/Badges" },
  { label: "Server Media",       free: "50 Emojis, 5 Stickers",        pro: "250 Emojis, 50 Stickers" },
  { label: "Soundboard",         free: "4 Custom Sounds",              pro: "48 Custom Sounds" },
  { label: "Server Banner",      free: "Static image",                 pro: "Animated Banners" },
];

const Cell = ({ value, isPro }: { value: string | boolean; isPro: boolean }) => {
  if (typeof value === "boolean") {
    return value
      ? <Check className="h-4 w-4 text-green-500 mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  return (
    <span className={cn("text-sm", isPro && "font-medium text-foreground")}>
      {value}
    </span>
  );
};

const SubscriptionsTab = () => {
  const { t } = useTranslation();

  const onSubscribe = () =>
    toast({ title: t("pro.billingComingSoon") });

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative rounded-2xl overflow-hidden p-8 text-center bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
              <Crown className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground leading-tight">
            Unlock the Ultimate Experience
            <br />
            <span className="text-primary">with Mshb Pro</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Premium themes, animated avatars, higher upload limits, and much more — all in one subscription.
          </p>
          <Button
            size="lg"
            className="mt-2 gap-2 font-bold"
            onClick={onSubscribe}
          >
            <Sparkles className="h-4 w-4" />
            {t("pro.subscribeButton")}
          </Button>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-3 bg-muted/30">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Feature
          </div>
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-center text-muted-foreground border-s border-border/50">
            Free
          </div>
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-center text-primary border-s border-border/50 bg-primary/5">
            <span className="flex items-center justify-center gap-1">
              <Crown className="h-3 w-3" /> Mshb Pro
            </span>
          </div>
        </div>

        {/* Rows */}
        {FEATURES.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "grid grid-cols-3 border-t border-border/40",
              i % 2 === 0 ? "bg-background" : "bg-muted/10"
            )}
          >
            <div className="px-5 py-3 text-sm font-medium text-foreground">
              {row.label}
            </div>
            <div className="px-5 py-3 text-center text-muted-foreground border-s border-border/30 flex items-center justify-center">
              <Cell value={row.free} isPro={false} />
            </div>
            <div className="px-5 py-3 text-center border-s border-border/30 bg-primary/5 flex items-center justify-center">
              <Cell value={row.pro} isPro={true} />
            </div>
          </div>
        ))}
      </div>

      {/* CTA Footer */}
      <div className="text-center space-y-2">
        <Button size="lg" className="gap-2 font-bold w-full sm:w-auto" onClick={onSubscribe}>
          <Sparkles className="h-4 w-4" />
          {t("pro.subscribeButton")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("pro.billingComingSoon")}</p>
      </div>
    </div>
  );
};

export default SubscriptionsTab;
