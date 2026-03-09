import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/hooks/use-toast";
import { Zap, Loader2 } from "lucide-react";

interface Boost {
  id: string;
  status: "active" | "past_due" | "canceled";
  started_at: string;
  server: {
    id: string;
    name: string;
    icon_url: string | null;
  } | null;
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  active:   { label: "statusActive",   class: "bg-green-500/15 text-green-600 border-green-500/30" },
  past_due: { label: "statusPastDue",  class: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  canceled: { label: "statusCanceled", class: "bg-muted text-muted-foreground border-border" },
};

const BoostsTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const fetchBoosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_boosts" as any)
      .select("id, status, started_at, servers(id, name, icon_url)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    if (data) {
      setBoosts(
        (data as any[]).map((row) => ({
          id: row.id,
          status: row.status,
          started_at: row.started_at,
          server: row.servers ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchBoosts(); }, [user]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-streampay-subscription", {
        body: { boost_id: cancelTarget },
      });
      if (error) throw error;
      toast({ title: t("serverBoost.cancelSuccess") });
      fetchBoosts();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setCanceling(false);
      setCancelTarget(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-extrabold">{t("settings.myBoosts")}</h2>

      {boosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Zap className="h-10 w-10 opacity-30" />
          <p className="text-sm">{t("serverBoost.noBoosts")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boosts.map((boost) => {
            const badgeCfg = STATUS_BADGE[boost.status] ?? STATUS_BADGE.canceled;
            return (
              <div
                key={boost.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {boost.server?.icon_url && (
                    <AvatarImage src={boost.server.icon_url} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {boost.server?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {boost.server?.name ?? t("common.unknown")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("serverBoost.boostedSince", { date: fmt(boost.started_at) })}
                  </p>
                </div>

                <Badge variant="outline" className={`text-xs shrink-0 ${badgeCfg.class}`}>
                  {t(`serverBoost.${badgeCfg.label}`)}
                </Badge>

                {boost.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setCancelTarget(boost.id)}
                  >
                    {t("serverBoost.cancelAutoRenew")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("serverBoost.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("serverBoost.cancelConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("serverBoost.cancelAutoRenew")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BoostsTab;
