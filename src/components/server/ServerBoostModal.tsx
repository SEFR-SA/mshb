import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Check, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const PROD_BASE = "https://mshb.vercel.app";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
}

// Cumulative boost count needed to reach each level (mirrors Phase 1 SQL)
const THRESHOLDS = [2, 7, 14]; // index 0 = threshold for Level 1, etc.

const ServerBoostModal = ({ open, onOpenChange, serverId, serverName }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [boostCount, setBoostCount] = useState(0);
  const [boostLevel, setBoostLevel] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup window polling on unmount
  useEffect(() => {
    return () => {
      if (windowCheckRef.current) clearInterval(windowCheckRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !serverId) return;
    const fetchBoostData = async () => {
      setFetching(true);
      const { data } = await supabase
        .from("servers")
        .select("boost_count, boost_level")
        .eq("id", serverId)
        .single();
      if (data) {
        setBoostCount((data as any).boost_count ?? 0);
        setBoostLevel((data as any).boost_level ?? 0);
      }
      setFetching(false);
    };
    fetchBoostData();
  }, [open, serverId]);

  // Realtime subscription for instant UI sync
  useEffect(() => {
    if (!open || !user?.id || !serverId) return;
    const channel = supabase
      .channel(`boost-modal-${serverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_boosts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as { server_id?: string };
          if (newRow.server_id === serverId) {
            toast({
              title: t("serverBoost.boostSuccess", "Server successfully boosted!"),
              description: t("serverBoost.boostSuccessDesc", "Thank you for boosting this server!"),
            });
            setAwaitingPayment(false);
            setLoading(false);
            // Refetch boost data
            supabase
              .from("servers")
              .select("boost_count, boost_level")
              .eq("id", serverId)
              .single()
              .then(({ data }) => {
                if (data) {
                  setBoostCount((data as any).boost_count ?? 0);
                  setBoostLevel((data as any).boost_level ?? 0);
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user?.id, serverId, t]);

  const nextThreshold = boostLevel < 3 ? THRESHOLDS[boostLevel] : 14;
  const progress = boostLevel === 3 ? 100 : Math.round((boostCount / nextThreshold) * 100);
  const remaining = boostLevel === 3 ? 0 : Math.max(0, nextThreshold - boostCount);

  const perkTiers = [
    { level: 1, items: [t("serverBoost.perks.level1Item1"), t("serverBoost.perks.level1Item2")] },
    { level: 2, items: [t("serverBoost.perks.level2Item1"), t("serverBoost.perks.level2Item2")] },
    { level: 3, items: [t("serverBoost.perks.level3Item1"), t("serverBoost.perks.level3Item2")] },
  ];

  const handleBoost = async () => {
    setLoading(true);
    const res = await supabase.functions.invoke("create-streampay-checkout", {
      body: {
        server_id: serverId,
        success_url: `${PROD_BASE}/#/boost/success?server_id=${serverId}`,
        cancel_url: `${PROD_BASE}/#/boost/cancel?server_id=${serverId}`,
      },
    });
    if (res.error || res.data?.error) {
      setLoading(false);
      toast({
        title: t("common.error"),
        description: res.data?.error || res.error?.message,
        variant: "destructive",
      });
    } else {
      window.open(res.data.payment_url, '_blank');
      setLoading(false);
      setAwaitingPayment(true);
    }
  };

  const isButtonDisabled = loading || fetching || awaitingPayment;
  const buttonLabel = loading
    ? t("serverBoost.boosting")
    : awaitingPayment
      ? t("serverBoost.awaitingPayment", "Awaiting Payment...")
      : t("serverBoost.boostThisServer");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Hero header */}
        <div className="flex flex-col items-center justify-center gap-2 py-6 px-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-b border-border/40">
          <div className="rounded-full bg-pink-500/20 p-3">
            <Zap className="h-7 w-7 text-pink-500" />
          </div>
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-lg">{t("serverBoost.boostingTitle")}</DialogTitle>
            <DialogDescription className="text-center">{serverName}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* Level badge + boost count */}
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="bg-purple-500/20 text-purple-400 border border-purple-500/30"
            >
              {t("serverBoost.currentLevel", { level: boostLevel })}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {fetching ? "…" : t("serverBoost.boostCount", { count: boostCount })}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <Progress value={fetching ? 0 : progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              {fetching
                ? "…"
                : boostLevel === 3
                  ? t("serverBoost.maxLevel")
                  : t("serverBoost.progressLabel", { remaining, next: boostLevel + 1 })}
            </p>
          </div>

          {/* Perks list */}
          <div className="space-y-3">
            {perkTiers.map(({ level, items }) => (
              <div key={level}>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
                  {t("serverBoost.currentLevel", { level })}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const unlocked = boostLevel >= level;
                    return (
                      <div
                        key={item}
                        className={`flex items-center gap-2 text-sm ${unlocked ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {unlocked
                          ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                        {item}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              onClick={handleBoost}
              disabled={isButtonDisabled}
            >
              {(loading || awaitingPayment) ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {buttonLabel}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 me-2" />
                  {buttonLabel}
                </>
              )}
            </Button>
            {awaitingPayment ? (
              <p className="text-center text-xs text-muted-foreground animate-pulse">
                {t("serverBoost.awaitingPaymentHint", "A payment window has opened. This page will automatically update once your payment is complete.")}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">{t("serverBoost.priceNote")}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerBoostModal;
