import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, X, Sparkles, Crown, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PROD_BASE = "https://mshb.vercel.app";

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
  { label: "File Upload Limit",  free: "50 MB",                        pro: "500 MB" },
  { label: "Global Media",       free: "Within server only",           pro: "Server Emojis & Stickers anywhere" },
  { label: "Screen Share",       free: "1080p / 30fps",                pro: "1080p / 60fps & Source Quality" },
  { label: "Audio Quality",      free: "High Fidelity (384 kbps)",     pro: "High Fidelity (384 kbps)" },
  { label: "Role Customization", free: "Colors & Names",               pro: "Custom Role Icons/Badges" },
  { label: "Server Media",       free: "50 Emojis, 5 Stickers",        pro: "250 Emojis, 50 Stickers" },
  { label: "Soundboard",         free: "4 Custom Sounds",              pro: "48 Custom Sounds" },
  { label: "Server Banner",      free: "Static image",                 pro: "Animated Banners" },
  { label: "Included Boosts",    free: false,                          pro: "2 Server Boosts" },
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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [subscription, setSubscription] = useState<{
    id: string;
    tier: string;
    status: string;
    started_at: string;
  } | null>(null);

  const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_subscriptions" as any)
      .select("id, tier, status, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (windowCheckRef.current) clearInterval(windowCheckRef.current);
    };
  }, []);

  // Realtime listener for instant UI update after payment
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`pro-sub-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (windowCheckRef.current) {
            clearInterval(windowCheckRef.current);
            windowCheckRef.current = null;
          }
          toast({
            title: t("pro.subscribeSuccess", "Welcome to Mshb Pro!"),
            description: t("pro.subscribeSuccessDesc", "Your premium features are now active."),
          });
          setAwaitingPayment(false);
          setSubscribing(false);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchSubscription, t]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    const res = await supabase.functions.invoke("create-pro-checkout", {
      body: {
        success_url: `${PROD_BASE}/#/settings`,
        cancel_url: `${PROD_BASE}/#/settings`,
      },
    });

    if (res.error || res.data?.error) {
      setSubscribing(false);
      toast({ title: t("common.error"), description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      const paymentWindow = window.open(res.data.payment_url, "_blank");
      setSubscribing(false);
      setAwaitingPayment(true);
      windowCheckRef.current = setInterval(() => {
        if (paymentWindow?.closed) {
          clearInterval(windowCheckRef.current!);
          windowCheckRef.current = null;
          setAwaitingPayment(false);
          toast({ title: t("serverBoost.paymentWindowClosed", "Payment window closed") });
        }
      }, 500);
    }
  };

  const isActive = !!subscription || profile?.is_pro;
  const isButtonDisabled = subscribing || awaitingPayment;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

          {isActive ? (
            <>
              <h2 className="text-2xl font-extrabold text-foreground leading-tight">
                {t("pro.activeTitle", "You're a Pro Member!")}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                  <Zap className="h-3 w-3" /> {t("pro.active", "Active")}
                </Badge>
                {subscription && (
                  <span className="text-xs text-muted-foreground">
                    {t("pro.since", "Since")} {new Date(subscription.started_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {t("pro.activeDesc", "You have access to all premium features including 2 server boosts.")}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-foreground leading-tight">
                Unlock the Ultimate Experience
                <br />
                <span className="text-primary">with Mshb Pro</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Premium themes, animated avatars, higher upload limits, 2 server boosts, and much more — all in one subscription.
              </p>
              <Button
                size="lg"
                className="mt-2 gap-2 font-bold"
                onClick={handleSubscribe}
                disabled={isButtonDisabled}
              >
                {(subscribing || awaitingPayment) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {awaitingPayment
                  ? t("serverBoost.awaitingPayment", "Awaiting Payment...")
                  : t("pro.subscribeButton")}
              </Button>
              {awaitingPayment && (
                <p className="text-sm text-muted-foreground animate-pulse mt-1">
                  {t("serverBoost.awaitingPaymentHint", "A payment window has opened. This page will automatically update once your payment is complete.")}
                </p>
              )}
            </>
          )}
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
      {!isActive && (
        <div className="text-center space-y-2">
          <Button
            size="lg"
            className="gap-2 font-bold w-full sm:w-auto"
            onClick={handleSubscribe}
            disabled={isButtonDisabled}
          >
            {(subscribing || awaitingPayment) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {awaitingPayment
              ? t("serverBoost.awaitingPayment", "Awaiting Payment...")
              : t("pro.subscribeButton")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsTab;
