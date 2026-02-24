import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Users, X } from "lucide-react";

interface ServerInviteMetadata {
  server_id: string;
  invite_code: string;
  server_name: string;
  server_icon_url?: string;
}

interface Props {
  metadata: ServerInviteMetadata;
  isMine: boolean;
}

const ServerInviteCard = ({ metadata, isMine }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "joined" | "declined">("pending");

  const handleJoin = async () => {
    if (!user || loading) return;
    setLoading(true);

    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from("server_members")
        .select("id")
        .eq("server_id", metadata.server_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate(`/server/${metadata.server_id}`);
        toast({ title: t("servers.alreadyMember") });
        setStatus("joined");
        setLoading(false);
        return;
      }

      // Use invite RPC to validate and increment
      const { data: serverId, error } = await supabase.rpc("use_invite", { p_code: metadata.invite_code });

      if (error || !serverId) {
        toast({ title: t("servers.inviteInvalid"), description: t("servers.inviteInvalidDesc"), variant: "destructive" });
        setLoading(false);
        return;
      }

      // Join server
      await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: user.id,
        role: "member",
      });

      setStatus("joined");
      toast({ title: t("servers.joinedServer") });
      navigate(`/server/${serverId}`);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDecline = () => {
    setStatus("declined");
  };

  return (
    <Card className="w-full max-w-[280px] overflow-hidden border-border/50">
      {/* Header bar */}
      <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {t("servers.invitedToJoin")}
      </div>

      {/* Server info */}
      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar className="h-10 w-10 rounded-xl">
          <AvatarImage src={metadata.server_icon_url || ""} />
          <AvatarFallback className="bg-primary/20 text-primary rounded-xl text-sm font-bold">
            {metadata.server_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-foreground">{metadata.server_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {t("servers.joinServer")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3">
        {status === "pending" && !isMine ? (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleJoin} disabled={loading}>
              {loading ? t("servers.joining") : t("servers.joinServer")}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDecline}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : status === "joined" ? (
          <p className="text-xs text-center text-muted-foreground py-1">{t("servers.joinedServer")}</p>
        ) : status === "declined" ? (
          <p className="text-xs text-center text-muted-foreground py-1">{t("servers.inviteDeclined")}</p>
        ) : isMine ? (
          <p className="text-xs text-center text-muted-foreground py-1">{t("servers.invitedToJoin")}</p>
        ) : null}
      </div>
    </Card>
  );
};

export default ServerInviteCard;
