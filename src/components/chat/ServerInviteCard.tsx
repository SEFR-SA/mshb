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
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import type { ServerInviteMetadata } from "@/lib/inviteUtils";

interface Props {
  metadata: ServerInviteMetadata;
  isMine: boolean;
}

type InviteStatus = "loading" | "valid" | "expired" | "maxed" | "not_found" | "already_joined";

const ServerInviteCard = ({ metadata, isMine }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [serverCreatedAt, setServerCreatedAt] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [joining, setJoining] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [serverId, setServerId] = useState(metadata.server_id);

  useEffect(() => {
    const load = async () => {
      // Use validate_invite RPC — bypasses RLS, returns real-time status
      const { data, error } = await supabase.rpc("validate_invite" as any, { p_code: metadata.invite_code });
      if (error || !data) {
        setInviteStatus("not_found");
        return;
      }

      const result = data as any;
      const status = result.status as string;

      if (status === "not_found") {
        setInviteStatus("not_found");
        return;
      }
      if (status === "expired") {
        setInviteStatus("expired");
        return;
      }
      if (status === "maxed") {
        setInviteStatus("maxed");
        return;
      }

      // Valid invite — populate details from RPC response
      setServerId(result.server_id);
      setMemberCount(Number(result.member_count));
      setOnlineCount(Number(result.online_count));
      setServerCreatedAt(result.server_created_at ?? null);

      // Check if user is already a member
      if (user) {
        const { data: membership } = await supabase
          .from("server_members" as any)
          .select("id")
          .eq("server_id", result.server_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          setInviteStatus("already_joined");
          return;
        }
      }

      setInviteStatus("valid");
    };
    load();
  }, [metadata.invite_code, user]);

  const handleJoin = async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      // use_invite now atomically validates, increments, AND inserts membership
      const { data: sid, error } = await supabase.rpc("use_invite", { p_code: metadata.invite_code });
      if (error || !sid) {
        toast({ title: t("servers.inviteInvalid"), description: t("servers.inviteInvalidDesc"), variant: "destructive" });
        setInviteStatus("expired");
        setJoining(false);
        return;
      }
      setInviteStatus("already_joined");
      toast({ title: t("servers.joinedServer") });
      navigate(`/server/${sid}`);
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

  const isMember = inviteStatus === "already_joined";
  const isInvalid = inviteStatus === "expired" || inviteStatus === "maxed" || inviteStatus === "not_found";

  return (
    <div className={cn("w-full max-w-[320px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm", isInvalid && "opacity-75")}>
      {/* Banner area */}
      <div className="relative h-[80px] bg-gradient-to-br from-primary/30 to-muted/60">
        {metadata.server_banner_url && (
          <div className="absolute inset-0 overflow-hidden">
            <img src={metadata.server_banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="absolute -bottom-5 left-4">
          <Avatar className="h-14 w-14 rounded-2xl ring-4 ring-card">
            <AvatarImage src={metadata.server_icon_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary rounded-2xl text-lg font-bold">
              {metadata.server_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
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

      <div className="pt-7 px-4 pb-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("servers.youAreInvited")}
        </p>
        <h3 className="font-bold text-base leading-tight truncate">{metadata.server_name}</h3>

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

        {serverCreatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("servers.serverCreatedAt", { date: formatDate(serverCreatedAt) })}
          </p>
        )}

        <div className="border-t border-border/40 pt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            {metadata.expires_at
              ? t("servers.inviteExpires", { date: formatDate(metadata.expires_at) })
              : t("servers.inviteNeverExpires")}
          </p>

          {inviteStatus === "loading" ? (
            <Button size="sm" className="w-full h-8 text-xs" disabled>
              <Loader2 className="h-3 w-3 me-1 animate-spin" />
            </Button>
          ) : isMember ? (
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/server/${serverId}`)}
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
          ) : inviteStatus === "expired" || inviteStatus === "not_found" ? (
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
