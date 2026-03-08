import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Users, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServerInviteMetadata } from "@/lib/inviteUtils";

interface Props {
  metadata: ServerInviteMetadata;
  isMine: boolean;
}

type InviteStatus = "loading" | "valid" | "expired" | "maxed";

const ServerInviteCard = ({ metadata, isMine }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [joining, setJoining] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      // 1. Fetch member IDs for this server
      const { data: members } = await supabase
        .from("server_members" as any)
        .select("user_id")
        .eq("server_id", metadata.server_id);
      const ids: string[] = (members || []).map((m: any) => m.user_id);
      setMemberCount(ids.length);

      // 2. Online count — profiles with last_seen in the last 5 minutes
      if (ids.length > 0) {
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .in("user_id", ids)
          .gt("last_seen", since);
        setOnlineCount(count ?? 0);
      } else {
        setOnlineCount(0);
      }

      // 3. Is current user already a member?
      if (user) {
        const { data: membership } = await supabase
          .from("server_members" as any)
          .select("id")
          .eq("server_id", metadata.server_id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsMember(!!membership);
      }

      // 4. Server created_at
      const { data: srv } = await supabase
        .from("servers")
        .select("created_at")
        .eq("id", metadata.server_id)
        .single();
      setCreatedAt((srv as any)?.created_at ?? null);

      // 5. Invite validity
      const { data: inv } = await supabase
        .from("invites" as any)
        .select("expires_at, max_uses, use_count")
        .eq("code", metadata.invite_code)
        .maybeSingle();
      if (!inv) {
        setInviteStatus("expired");
        return;
      }
      const isExpired = (inv as any).expires_at && new Date((inv as any).expires_at) < new Date();
      const isMaxed = (inv as any).max_uses && (inv as any).use_count >= (inv as any).max_uses;
      setInviteStatus(isExpired ? "expired" : isMaxed ? "maxed" : "valid");
    };
    load();
  }, [metadata.server_id, metadata.invite_code, user]);

  const handleJoin = async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      const { data: serverId, error } = await supabase.rpc("use_invite", { p_code: metadata.invite_code });
      if (error || !serverId) {
        toast({ title: t("servers.inviteInvalid"), description: t("servers.inviteInvalidDesc"), variant: "destructive" });
        setInviteStatus("expired");
        setJoining(false);
        return;
      }
      await supabase.from("server_members" as any).insert({
        server_id: serverId,
        user_id: user.id,
        role: "member",
      } as any);
      setIsMember(true);
      toast({ title: t("servers.joinedServer") });
      navigate(`/server/${serverId}`);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setJoining(false);
  };

  if (dismissed) return null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  const isInvalid = inviteStatus === "expired" || inviteStatus === "maxed";

  return (
    <div className={cn("w-full max-w-[320px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm", isInvalid && "opacity-75")}>
      {/* Banner area */}
      <div className="relative h-[80px] bg-gradient-to-br from-primary/30 to-muted/60">
        {metadata.server_banner_url && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={metadata.server_banner_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {/* Server icon overlapping the bottom edge of the banner */}
        <div className="absolute -bottom-5 left-4">
          <Avatar className="h-14 w-14 rounded-2xl ring-4 ring-card">
            <AvatarImage src={metadata.server_icon_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary rounded-2xl text-lg font-bold">
              {metadata.server_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Dismiss button (receiver only) */}
        {!isMine && !isMember && (
          <button
            className="absolute top-2 end-2 h-6 w-6 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            onClick={() => setDismissed(true)}
            title={t("servers.inviteDeclined")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content area — top padding to clear the overlapping icon */}
      <div className="pt-7 px-4 pb-4 space-y-2">
        {/* Header label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("servers.youAreInvited")}
        </p>

        {/* Server name */}
        <h3 className="font-bold text-base leading-tight truncate">{metadata.server_name}</h3>

        {/* Online / Member counts */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {inviteStatus === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                {t("servers.onlineNow", { count: onlineCount ?? 0 })}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 inline-block" />
                {t("servers.totalMembers", { count: memberCount ?? 0 })}
              </span>
            </>
          )}
        </div>

        {/* Created date */}
        {createdAt && (
          <p className="text-xs text-muted-foreground">
            {t("servers.serverCreatedAt", { date: formatDate(createdAt) })}
          </p>
        )}

        <div className="border-t border-border/40 pt-2 space-y-2">
          {/* Invite expiry */}
          <p className="text-xs text-muted-foreground">
            {metadata.expires_at
              ? t("servers.inviteExpires", { date: formatDate(metadata.expires_at) })
              : t("servers.inviteNeverExpires")}
          </p>

          {/* CTA */}
          {inviteStatus === "loading" ? (
            <Button size="sm" className="w-full h-8 text-xs" disabled>
              <Loader2 className="h-3 w-3 me-1 animate-spin" />
            </Button>
          ) : isMember ? (
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/server/${metadata.server_id}`)}
            >
              {t("servers.goToServer")}
            </Button>
          ) : inviteStatus === "valid" ? (
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <><Loader2 className="h-3 w-3 me-1 animate-spin" />{t("servers.joining")}</>
              ) : (
                <><Users className="h-3 w-3 me-1" />{t("servers.joinServer")}</>
              )}
            </Button>
          ) : inviteStatus === "expired" ? (
            <div className="space-y-1">
              <p className="text-xs text-destructive">{t("servers.inviteInvalidDesc")}</p>
              <p className="text-xs text-muted-foreground">{t("servers.requestNewInvite")}</p>
            </div>
          ) : inviteStatus === "maxed" ? (
            <div className="space-y-1">
              <p className="text-xs text-destructive">{t("servers.inviteMaxReached")}</p>
              <p className="text-xs text-muted-foreground">{t("servers.requestNewInvite")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ServerInviteCard;
