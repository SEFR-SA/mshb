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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Zap, Loader2, Package, Settings2, ArrowRightLeft, CalendarOff, CalendarCheck } from "lucide-react";

interface Boost {
  id: string;
  status: "active" | "past_due" | "canceled";
  started_at: string;
  auto_renew: boolean;
  expires_at: string | null;
  server: {
    id: string;
    name: string;
    icon_url: string | null;
  } | null;
}

interface ServerOption {
  id: string;
  name: string;
  icon_url: string | null;
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

  // Cancel confirm dialog
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  // Transfer modal
  const [transferBoostId, setTransferBoostId] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const fetchBoosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_boosts" as any)
      .select("id, status, started_at, auto_renew, expires_at, server_id, servers(id, name, icon_url)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    if (data) {
      setBoosts(
        (data as any[]).map((row) => ({
          id: row.id,
          status: row.status,
          started_at: row.started_at,
          auto_renew: row.auto_renew ?? true,
          expires_at: row.expires_at ?? null,
          server: row.servers ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchBoosts(); }, [user]);

  // Toggle auto-renew
  const handleToggleAutoRenew = async (boostId: string, currentAutoRenew: boolean) => {
    setCanceling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-streampay-subscription", {
        body: { boost_id: boostId, resume: currentAutoRenew === false },
      });
      if (error) throw error;
      toast({
        title: currentAutoRenew
          ? t("serverBoost.cancelSuccess", "Auto-renew canceled")
          : t("serverBoost.resumeSuccess", "Auto-renew resumed"),
      });
      fetchBoosts();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setCanceling(false);
      setCancelTarget(null);
    }
  };

  // Transfer boost
  const openTransferModal = async (boostId: string) => {
    setTransferBoostId(boostId);
    setLoadingServers(true);
    const { data } = await supabase
      .from("server_members")
      .select("server_id, servers(id, name, icon_url)")
      .eq("user_id", user!.id);
    if (data) {
      setServers(
        (data as any[])
          .filter((r) => r.servers)
          .map((r) => r.servers as ServerOption)
      );
    }
    setLoadingServers(false);
  };

  const handleTransfer = async (newServerId: string) => {
    if (!transferBoostId) return;
    setTransferring(true);
    try {
      const { error } = await supabase.rpc("transfer_boost", {
        p_boost_id: transferBoostId,
        p_new_server_id: newServerId,
      });
      if (error) throw error;
      toast({ title: t("serverBoost.transferSuccess", "Boost transferred!") });
      fetchBoosts();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setTransferring(false);
      setTransferBoostId(null);
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

  const activeBoosts = boosts.filter(b => b.status === "active" && (!b.expires_at || new Date(b.expires_at) > new Date()));
  const totalBoosts = activeBoosts.length;
  const spentBoosts = activeBoosts.filter(b => b.server !== null).length;
  const availableBoosts = activeBoosts.filter(b => b.server === null).length;

  const assignedBoosts = boosts.filter(b => b.server !== null);
  const unassignedBoosts = boosts.filter(b => b.server === null && b.status === "active");

  return (
    <div className="space-y-6">
      <h2 className="text-base font-extrabold">{t("settings.myBoosts")}</h2>

      {/* Inventory Summary */}
      {totalBoosts > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{availableBoosts}</p>
            <p className="text-xs text-muted-foreground">{t("serverBoost.available", "Available")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{spentBoosts}</p>
            <p className="text-xs text-muted-foreground">{t("serverBoost.spent", "In Use")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalBoosts}</p>
            <p className="text-xs text-muted-foreground">{t("serverBoost.totalActive", "Total Active")}</p>
          </div>
        </div>
      )}

      {/* Unassigned Boosts */}
      {unassignedBoosts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            {t("serverBoost.unassigned", "Unassigned Boosts")}
          </h3>
          {unassignedBoosts.map((boost) => (
            <div
              key={boost.id}
              className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t("serverBoost.inventoryBoost", "Inventory Boost")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("serverBoost.useOnServer", "Use this boost on any server you're a member of")}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 bg-green-500/15 text-green-600 border-green-500/30">
                {t("serverBoost.statusActive")}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Assigned Boosts */}
      {assignedBoosts.length === 0 && unassignedBoosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Zap className="h-10 w-10 opacity-30" />
          <p className="text-sm">{t("serverBoost.noBoosts")}</p>
        </div>
      ) : assignedBoosts.length > 0 && (
        <div className="space-y-3">
          {assignedBoosts.length > 0 && unassignedBoosts.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("serverBoost.assignedBoosts", "Server Boosts")}
            </h3>
          )}
          {assignedBoosts.map((boost) => {
            const badgeCfg = STATUS_BADGE[boost.status] ?? STATUS_BADGE.canceled;
            const isExpiring = !boost.auto_renew && boost.expires_at;
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
                  {isExpiring && (
                    <p className="text-xs text-yellow-600">
                      {t("serverBoost.expiresOn", { date: fmt(boost.expires_at!) })}
                    </p>
                  )}
                </div>

                <Badge variant="outline" className={`text-xs shrink-0 ${badgeCfg.class}`}>
                  {t(`serverBoost.${badgeCfg.label}`)}
                </Badge>

                {boost.status === "active" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openTransferModal(boost.id)}>
                        <ArrowRightLeft className="h-4 w-4 me-2" />
                        {t("serverBoost.transferBoost", "Transfer Boost")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (boost.auto_renew) {
                            setCancelTarget(boost.id);
                          } else {
                            handleToggleAutoRenew(boost.id, false);
                          }
                        }}
                      >
                        {boost.auto_renew ? (
                          <>
                            <CalendarOff className="h-4 w-4 me-2" />
                            {t("serverBoost.cancelAutoRenew")}
                          </>
                        ) : (
                          <>
                            <CalendarCheck className="h-4 w-4 me-2" />
                            {t("serverBoost.resumeAutoRenew", "Resume Auto-Renew")}
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Auto-Renew Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("serverBoost.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("serverBoost.cancelAutoRenewDesc", "Your boost will remain active until its expiration date, but won't renew automatically.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && handleToggleAutoRenew(cancelTarget, true)}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("serverBoost.cancelAutoRenew")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Boost Modal */}
      <Dialog open={!!transferBoostId} onOpenChange={(o) => { if (!o) setTransferBoostId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("serverBoost.transferBoost", "Transfer Boost")}</DialogTitle>
          </DialogHeader>
          {loadingServers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {servers.map((s) => (
                <button
                  key={s.id}
                  disabled={transferring}
                  onClick={() => handleTransfer(s.id)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30 transition-colors text-start"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {s.icon_url && <AvatarImage src={s.icon_url} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {s.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </button>
              ))}
              {servers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("serverBoost.noServers", "You're not a member of any servers.")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoostsTab;
