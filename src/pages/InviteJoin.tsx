import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, XCircle } from "lucide-react";

interface ServerData {
  id: string;
  name: string;
  icon_url: string | null;
  banner_url: string | null;
  created_at: string;
}

interface InviteData {
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
}

type PageStatus = "loading" | "invalid" | "preview" | "joining";

const InviteJoin = () => {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [server, setServer] = useState<ServerData | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadInvite();
  }, [code, user, authLoading]);

  const loadInvite = async () => {
    if (!code) { setStatus("invalid"); return; }

    // Validate the invite code
    const { data: serverId } = await supabase.rpc("get_server_id_by_invite_link", { p_code: code });
    if (!serverId) { setStatus("invalid"); return; }

    // Fetch server details
    const { data: serverData } = await supabase
      .from("servers")
      .select("id, name, icon_url, banner_url, created_at")
      .eq("id", serverId)
      .single();
    if (!serverData) { setStatus("invalid"); return; }
    setServer(serverData as any);

    // Fetch invite validity info
    const { data: inviteData } = await supabase
      .from("invites" as any)
      .select("expires_at, max_uses, use_count")
      .eq("code", code)
      .maybeSingle();

    if (inviteData) {
      const inv = inviteData as any;
      const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
      const isMaxed = inv.max_uses && inv.use_count >= inv.max_uses;
      if (isExpired || isMaxed) { setStatus("invalid"); return; }
      setInvite({ expires_at: inv.expires_at, max_uses: inv.max_uses, use_count: inv.use_count });
    }

    // Fetch members
    const { data: members } = await supabase
      .from("server_members" as any)
      .select("user_id")
      .eq("server_id", serverId);
    const ids: string[] = (members || []).map((m: any) => m.user_id);
    setMemberCount(ids.length);

    // Online count
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

    // If user is authenticated, check membership and auto-navigate if already a member
    if (user) {
      const { data: membership } = await supabase
        .from("server_members" as any)
        .select("id")
        .eq("server_id", serverId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (membership) {
        navigate(`/server/${serverId}`, { replace: true });
        return;
      }
    }

    setStatus("preview");
  };

  const handleJoin = async () => {
    if (!code || !user || !server) return;
    setStatus("joining");

    const { data: serverId, error } = await supabase.rpc("use_invite", { p_code: code });
    if (error || !serverId) {
      toast({ title: t("servers.inviteInvalid"), description: t("servers.inviteInvalidDesc"), variant: "destructive" });
      setStatus("invalid");
      return;
    }

    await supabase.from("server_members" as any).insert({
      server_id: serverId,
      user_id: user.id,
      role: "member",
    } as any);

    toast({ title: t("servers.joinedServer") });
    navigate(`/server/${serverId}`);
  };

  const handleLoginToJoin = () => {
    if (code) localStorage.setItem("pendingInvite", code);
    navigate("/auth");
  };

  const handleCreateAccount = () => {
    if (code) localStorage.setItem("pendingInvite", code);
    navigate("/auth?mode=signup");
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  // Loading state
  if (authLoading || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid/expired invite
  if (status === "invalid") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[320px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-lg text-center">
          <div className="h-[80px] bg-gradient-to-br from-destructive/20 to-muted/60 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive/70" />
          </div>
          <div className="p-6 space-y-3">
            <h3 className="font-bold text-base">{t("servers.inviteInvalid")}</h3>
            <p className="text-sm text-muted-foreground">{t("servers.inviteInvalidDesc")}</p>
            <Button className="w-full" onClick={() => navigate("/")}>{t("servers.goHome")}</Button>
          </div>
        </div>
      </div>
    );
  }

  // Preview (valid invite)
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[340px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-lg">
        {/* Banner */}
        <div className="relative h-[100px] bg-gradient-to-br from-primary/30 to-muted/60 overflow-hidden">
          {server?.banner_url && (
            <img src={server.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* Server icon overlapping banner */}
          <div className="absolute -bottom-6 left-5">
            <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-card">
              <AvatarImage src={server?.icon_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary rounded-2xl text-2xl font-bold">
                {server?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className="pt-9 px-5 pb-5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("servers.youAreInvited")}
          </p>
          <h3 className="font-bold text-lg leading-tight truncate">{server?.name}</h3>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              {t("servers.onlineNow", { count: onlineCount ?? 0 })}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50 inline-block" />
              {t("servers.totalMembers", { count: memberCount ?? 0 })}
            </span>
          </div>

          {/* Created date */}
          {server?.created_at && (
            <p className="text-xs text-muted-foreground">
              {t("servers.serverCreatedAt", { date: formatDate(server.created_at) })}
            </p>
          )}

          <div className="border-t border-border/40 pt-3 space-y-3">
            {/* Invite expiry */}
            <p className="text-xs text-muted-foreground">
              {invite?.expires_at
                ? t("servers.inviteExpires", { date: formatDate(invite.expires_at) })
                : t("servers.inviteNeverExpires")}
            </p>

            {/* CTA */}
            {!user ? (
              <div className="space-y-2">
                <Button className="w-full" onClick={handleLoginToJoin}>
                  <Users className="h-4 w-4 me-2" />
                  {t("servers.loginToJoin")}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleCreateAccount}>
                  {t("servers.createAccount")}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleJoin}
                disabled={status === "joining"}
              >
                {status === "joining" ? (
                  <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("servers.joining")}</>
                ) : (
                  <><Users className="h-4 w-4 me-2" />{t("servers.joinServer")}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteJoin;
