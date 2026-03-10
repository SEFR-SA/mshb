import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Zap, Check, X, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const THRESHOLDS = [2, 7, 14];

interface ServerData {
  id: string;
  name: string;
  icon_url: string | null;
  boost_count: number;
  boost_level: number;
}

const LEVEL_PERKS = [
  {
    level: 1,
    threshold: 2,
    perks: [
      "100 Emoji Slots",
      "24 Soundboard Slots",
      "Animated Server Icon",
      "Better Quality Audio (128 kbps)",
      "Custom Server Banner",
    ],
  },
  {
    level: 2,
    threshold: 7,
    perks: [
      "1080p 60fps Streaming",
      "50MB File Uploads",
      "Custom Role Icons",
      "Server Banner",
      "150 Emoji Slots",
    ],
  },
  {
    level: 3,
    threshold: 14,
    perks: [
      "Custom Server Invite Link",
      "100MB File Uploads",
      "Highest Quality Audio (384 kbps)",
      "Animated Server Banner",
      "250 Emoji Slots",
    ],
  },
];

const COMPARISON_ROWS = [
  { perk: "Emoji Slots", values: ["50", "100", "150", "250"] },
  { perk: "Sticker Slots", values: ["5", "15", "30", "60"] },
  { perk: "Soundboard Slots", values: ["8", "24", "36", "48"] },
  { perk: "Stream Quality", values: ["720p", "720p 60fps", "1080p 60fps", "1080p 60fps"] },
  { perk: "Audio Quality", values: ["96 kbps", "128 kbps", "256 kbps", "384 kbps"] },
  { perk: "Upload Size Limit", values: ["8 MB", "8 MB", "50 MB", "100 MB"] },
  { perk: "Animated Server Icon", values: ["no", "yes", "yes", "yes"] },
  { perk: "Server Banner", values: ["no", "yes", "yes", "yes"] },
  { perk: "Custom Role Icons", values: ["no", "no", "yes", "yes"] },
  { perk: "Custom Invite Link", values: ["no", "no", "no", "yes"] },
];

const ServerBoostPage = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [server, setServer] = useState<ServerData | null>(null);
  const [userBoostCount, setUserBoostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const heroButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch server + user boost data
  useEffect(() => {
    if (!serverId || !user) return;
    const fetchData = async () => {
      setLoading(true);
      const [serverRes, boostRes] = await Promise.all([
        supabase.from("servers").select("id, name, icon_url, boost_count, boost_level").eq("id", serverId).single(),
        supabase.from("user_boosts").select("id").eq("server_id", serverId).eq("user_id", user.id).eq("status", "active"),
      ]);
      if (serverRes.data) {
        setServer(serverRes.data as ServerData);
      }
      setUserBoostCount(boostRes.data?.length ?? 0);
      setLoading(false);
    };
    fetchData();
  }, [serverId, user]);

  // Intersection Observer for sticky bar
  useEffect(() => {
    const btn = heroButtonRef.current;
    if (!btn) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(btn);
    return () => observer.disconnect();
  }, [loading]);

  const handleBoost = useCallback(async () => {
    if (!serverId) return;
    setBoosting(true);
    const base = window.location.href.split("#")[0];
    const res = await supabase.functions.invoke("create-streampay-checkout", {
      body: {
        server_id: serverId,
        success_url: `${base}#/boost/success?server_id=${serverId}`,
        cancel_url: `${base}#/boost/cancel?server_id=${serverId}`,
      },
    });
    setBoosting(false);
    if (res.error || res.data?.error) {
      toast({ title: t("common.error"), description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      window.location.href = res.data.payment_url;
    }
  }, [serverId, t]);

  if (loading || !server) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-primary animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const boostCount = server.boost_count;
  const boostLevel = server.boost_level;

  return (
    <div className="relative flex flex-col min-h-full h-full w-full bg-background overflow-y-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-30 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>

      {/* ===== HERO SECTION ===== */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
          <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-pink-500/15 blur-[120px] animate-pulse [animation-delay:1s]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        </div>

        {/* Server info */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-border/60">
            <AvatarImage src={server.icon_url ?? undefined} />
            <AvatarFallback className="text-2xl bg-muted">{server.name[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-foreground">{server.name}</h2>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border border-purple-500/30 gap-1.5">
            🔮 {t("serverBoost.boostCount", { count: boostCount })}
          </Badge>
          {userBoostCount > 0 && (
            <p className="text-sm text-muted-foreground">
              ({t("serverBoostPage.youBoosted", { count: userBoostCount })})
            </p>
          )}
        </div>

        {/* Headline */}
        <h1 className="relative z-10 mt-8 max-w-2xl text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {t("serverBoostPage.heroTitle")}
        </h1>

        {/* CTA Buttons */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            ref={heroButtonRef}
            onClick={handleBoost}
            disabled={boosting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8 h-12 text-base font-semibold shadow-lg shadow-purple-500/25"
          >
            <Zap className="h-5 w-5 me-2" />
            {boosting ? t("serverBoost.boosting") : t("serverBoost.boostThisServer")}
          </Button>
          <Button variant="outline" className="h-12 px-8 text-base">
            {t("serverBoostPage.giftPro")}
          </Button>
        </div>
      </section>

      {/* ===== LEVEL CARDS ===== */}
      <section className="relative px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Progress line across the top of cards */}
        <div className="hidden md:block absolute top-[68px] left-[calc(16.66%+12px)] right-[calc(16.66%+12px)] h-0.5 z-0">
          <div className="relative w-full h-full bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-700"
              style={{
                width:
                  boostLevel >= 3
                    ? "100%"
                    : boostLevel >= 2
                      ? "66%"
                      : boostLevel >= 1
                        ? "33%"
                        : "0%",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LEVEL_PERKS.map(({ level, threshold, perks }) => {
            const unlocked = boostCount >= threshold;
            const isHighlighted = level === 2;
            return (
              <div
                key={level}
                className={`relative rounded-xl border p-6 pt-12 backdrop-blur-md transition-all ${
                  isHighlighted
                    ? "bg-card/60 border-pink-500/40 shadow-lg shadow-pink-500/10"
                    : "bg-card/50 border-border/40"
                }`}
              >
                {/* Circular badge */}
                <div
                  className={`absolute -top-5 left-6 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    unlocked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <Gem className="h-4 w-4" />
                </div>

                {isHighlighted && (
                  <Badge className="absolute -top-3 right-4 bg-pink-500 text-white border-0 text-[10px] uppercase tracking-wider">
                    {t("serverBoostPage.recommended")}
                  </Badge>
                )}

                <h3 className="text-lg font-bold text-foreground mb-1">
                  {t("serverBoost.currentLevel", { level })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {threshold} {t("serverBoostPage.boostsNeeded")}
                </p>

                <ul className="space-y-2">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${unlocked ? "text-green-500" : "text-muted-foreground/40"}`} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <section className="px-6 py-12 max-w-6xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
          {t("serverBoostPage.comparisonTitle")}
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border/40 bg-card/50 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">{t("serverBoostPage.perks")}</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{t("serverBoostPage.unboosted")}</th>
                {[1, 2, 3].map((lvl) => (
                  <th
                    key={lvl}
                    className={`px-4 py-3 text-center font-semibold ${
                      lvl === 2 ? "text-pink-400 border-x border-pink-500/30" : "text-foreground"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {t("serverBoost.currentLevel", { level: lvl })}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({THRESHOLDS[lvl - 1]} {t("serverBoostPage.boostsNeeded")})
                      </span>
                      {lvl === 2 && (
                        <Badge className="bg-pink-500 text-white border-0 text-[9px] uppercase mt-0.5">
                          {t("serverBoostPage.recommended")}
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(({ perk, values }, i) => (
                <tr key={perk} className={`border-b border-border/20 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{perk}</td>
                  {values.map((val, idx) => (
                    <td
                      key={idx}
                      className={`px-4 py-3 text-center ${idx === 1 ? "border-x border-pink-500/30" : ""}`}
                    >
                      {val === "yes" ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : val === "no" ? (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-foreground">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== RECOGNITION SECTION ===== */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
          {t("serverBoostPage.recognitionTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, title: t("serverBoostPage.recMemberList"), desc: t("serverBoostPage.recMemberListDesc") },
            { icon: Award, title: t("serverBoostPage.recBadge"), desc: t("serverBoostPage.recBadgeDesc") },
            { icon: Shield, title: t("serverBoostPage.recRole"), desc: t("serverBoostPage.recRoleDesc") },
            { icon: Heart, title: t("serverBoostPage.recSupport"), desc: t("serverBoostPage.recSupportDesc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-3 rounded-xl border border-border/40 bg-card/50 backdrop-blur-md p-6 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom spacer for sticky bar */}
      <div className="h-20" />

      {/* ===== FLOATING STICKY ACTION BAR ===== */}
      <div
        className={`fixed bottom-0 left-0 w-full z-50 transition-all duration-300 ${
          showStickyBar
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-background/90 backdrop-blur-xl border-t border-border px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={server.icon_url ?? undefined} />
                <AvatarFallback className="text-xs bg-muted">{server.name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground truncate">{server.name}</span>
            </div>
            <Button
              onClick={handleBoost}
              disabled={boosting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-6 shrink-0"
            >
              <Zap className="h-4 w-4 me-2" />
              {boosting ? t("serverBoost.boosting") : t("serverBoost.boostThisServer")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerBoostPage;
