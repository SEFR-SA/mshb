import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Crown, ChevronDown, ChevronUp, Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  id: string;
  tier: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "pro" | "boost";
}

const BillingTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    // Fetch subscription
    const { data: subData } = await supabase
      .from("user_subscriptions" as any)
      .select("id, tier, status, started_at, expires_at, auto_renew")
      .eq("user_id", user.id)
      .in("status", ["active", "canceling"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subData) setSubscription(subData as any);

    // Fetch real transactions from boosts and subscriptions
    const txList: Transaction[] = [];

    const { data: boostTx } = await supabase
      .from("user_boosts" as any)
      .select("id, started_at, streampay_transaction_id, server_id")
      .eq("user_id", user.id)
      .not("streampay_transaction_id", "is", null)
      .order("started_at", { ascending: false });

    if (boostTx) {
      for (const b of boostTx as any[]) {
        txList.push({
          id: b.id,
          date: new Date(b.started_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
          description: b.server_id ? "Server Boost" : "Mshb Pro — Included Boost",
          amount: b.server_id ? "15.00 SAR" : "—",
          type: "boost",
        });
      }
    }

    const { data: subTx } = await supabase
      .from("user_subscriptions" as any)
      .select("id, started_at, tier, streampay_transaction_id")
      .eq("user_id", user.id)
      .not("streampay_transaction_id", "is", null)
      .order("started_at", { ascending: false });

    if (subTx) {
      for (const s of subTx as any[]) {
        txList.push({
          id: s.id,
          date: new Date(s.started_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
          description: `Mshb Pro — ${s.tier === "pro" ? "Monthly" : s.tier}`,
          amount: "24.99 SAR",
          type: "pro",
        });
      }
    }

    // Deduplicate and sort by date descending
    txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(txList);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-pro-subscription");
      if (error) throw error;
      toast({ title: t("pro.cancelSuccess", "Subscription canceled"), description: t("pro.cancelSuccessDesc", "Your Pro benefits will remain active until the expiration date.") });
      fetchData();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setCanceling(false);
      setCancelOpen(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const renewalDate = subscription
    ? subscription.expires_at
      ? fmt(subscription.expires_at)
      : fmt(new Date(new Date(subscription.started_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.billing")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.billingDesc", "View your subscription status and transaction history.")}
        </p>
      </div>

      {/* Subscription Status */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-5 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {t("settings.subscriptionStatus", "Subscription")}
        </h3>

        {subscription ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Mshb Pro</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.status === "canceling"
                    ? t("pro.activateUntil", { date: renewalDate })
                    : t("pro.renewsOn", { date: renewalDate })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  subscription.status === "canceling"
                    ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs"
                    : "bg-green-500/15 text-green-600 border-green-500/30 text-xs"
                }
              >
                {subscription.status === "canceling"
                  ? t("pro.canceling", "Canceling")
                  : t("pro.active", "Active")}
              </Badge>
            </div>

            {subscription.status === "active" && subscription.auto_renew && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}
              >
                {t("pro.cancelSubscription", "Cancel Subscription")}
              </Button>
            )}

            {subscription.status === "canceling" && (
              <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-700">
                  {t("pro.cancelingNote", "Your Pro benefits and included boosts will remain active until the expiration date. After that, they will be removed.")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("pro.noSubscription", "No active subscription. Subscribe to Mshb Pro from the Subscriptions tab.")}
          </p>
        )}
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="bg-muted/20 px-4 py-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t("settings.transactionHistory")}
          </h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("settings.noTransactions")}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => {
              const totalPrice = parseFloat(tx.amount) || 0;
              const basePrice = +(totalPrice / 1.15).toFixed(2);
              const vat = +(totalPrice - basePrice).toFixed(2);
              const isOpen = expandedTx === tx.id;
              const hasAmount = totalPrice > 0;
              return (
                <div key={tx.id}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors text-start"
                    onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tx.amount}</span>
                      {hasAmount && (isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
                    </div>
                  </button>
                  {isOpen && hasAmount && (
                    <div className="px-4 pb-4 pt-0 bg-muted/10">
                      <div className="rounded-lg border border-border/50 bg-background p-3 space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("settings.basePrice")}</span>
                          <span>{basePrice.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("settings.vat")}</span>
                          <span>{vat.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-border/50 pt-2">
                          <span>{t("settings.total")}</span>
                          <span>{total.toFixed(2)} SAR</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pro.cancelConfirmTitle", "Cancel Mshb Pro?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pro.cancelConfirmDesc", "Your Pro benefits and 2 included server boosts will remain active until the end of your current billing period. After that, they will be removed.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("pro.confirmCancel", "Yes, Cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingTab;
