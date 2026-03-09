import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Zap, Loader2 } from "lucide-react";

// Must match THRESHOLDS in ServerBoostModal
const THRESHOLDS = [2, 7, 14];

interface ActiveBoost {
  id: string;
  user_id: string;
  started_at: string;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  serverId: string;
}

const ServerBoostsTab = ({ serverId }: Props) => {
  const { t } = useTranslation();
  const [boostCount, setBoostCount] = useState(0);
  const [boostLevel, setBoostLevel] = useState(0);
  const [boosters, setBoosters] = useState<ActiveBoost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [serverRes, boostsRes] = await Promise.all([
      supabase
        .from("servers" as any)
        .select("boost_count, boost_level")
        .eq("id", serverId)
        .maybeSingle(),
      supabase
        .from("user_boosts" as any)
        .select("id, user_id, started_at, profiles(display_name, username, avatar_url)")
        .eq("server_id", serverId)
        .eq("status", "active")
        .order("started_at"),
    ]);

    if (serverRes.data) {
      setBoostCount((serverRes.data as any).boost_count ?? 0);
      setBoostLevel((serverRes.data as any).boost_level ?? 0);
    }
    if (boostsRes.data) {
      setBoosters(
        (boostsRes.data as any[]).map((row) => ({
          id: row.id,
          user_id: row.user_id,
          started_at: row.started_at,
          profile: row.profiles ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`server-boosts-tab-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_boosts", filter: `server_id=eq.${serverId}` },
        () => fetchData()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [serverId]);

  // Progress bar calculation
  const prevThreshold = boostLevel > 0 ? THRESHOLDS[boostLevel - 1] : 0;
  const nextThreshold = THRESHOLDS[boostLevel] ?? THRESHOLDS[THRESHOLDS.length - 1];
  const atMax = boostLevel >= 3;
  const progressPct = atMax
    ? 100
    : Math.min(((boostCount - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-base font-extrabold">{t("serverBoost.serverBoostStatus")}</h2>

      {/* Level badge + count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-pink-500/15 border border-pink-500/30 px-4 py-2">
          <Zap className="h-5 w-5 text-pink-500" />
          <span className="font-bold text-pink-500 text-sm">
            {t("serverBoost.currentLevel", { level: boostLevel })}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {t("serverBoost.boostCount", { count: boostCount })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progressPct} className="h-3 [&>div]:bg-pink-500" />
        <p className="text-xs text-muted-foreground">
          {atMax
            ? t("serverBoost.maxLevel")
            : t("serverBoost.progressLabel", {
                remaining: nextThreshold - boostCount,
                next: boostLevel + 1,
              })}
        </p>
      </div>

      {/* Active boosters */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t("serverBoost.activeBoostersTitle")}</h3>
        {boosters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("serverBoost.noBoosters")}</p>
        ) : (
          <div className="space-y-2">
            {boosters.map((b) => {
              const name = b.profile?.display_name || b.profile?.username || "User";
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {b.profile?.avatar_url && <AvatarImage src={b.profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("serverBoost.boostedSince", { date: fmt(b.started_at) })}
                    </p>
                  </div>
                  <Zap className="h-4 w-4 text-pink-500 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerBoostsTab;
