import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, XCircle, Users } from "lucide-react";

const InviteJoin = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "joining" | "already">("loading");
  const [serverInfo, setServerInfo] = useState<{ id: string; name: string; icon_url: string | null; member_count: number } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=/invite/${code}`);
      return;
    }
    validateInvite();
  }, [code, user, authLoading]);

  const validateInvite = async () => {
    if (!code) { setStatus("invalid"); return; }

    const { data: serverId } = await supabase.rpc("get_server_id_by_invite_link", { p_code: code });
    if (!serverId) { setStatus("invalid"); return; }

    // Check if already a member
    const { data: membership } = await supabase
      .from("server_members" as any)
      .select("id")
      .eq("server_id", serverId)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (membership) {
      navigate(`/server/${serverId}`);
      return;
    }

    // Get server info
    // We can't query servers directly (RLS requires membership), so use a simpler approach
    // The server name can be fetched after joining. For now show basic info.
    setServerInfo({ id: serverId, name: "Server", icon_url: null, member_count: 0 });
    setStatus("valid");
  };

  const handleJoin = async () => {
    if (!code || !user || !serverInfo) return;
    setStatus("joining");

    const { data: serverId } = await supabase.rpc("use_invite", { p_code: code });
    if (!serverId) {
      setStatus("invalid");
      toast({ title: "Invite is no longer valid", variant: "destructive" });
      return;
    }

    await supabase.from("server_members" as any).insert({
      server_id: serverId,
      user_id: user.id,
      role: "member",
    } as any);

    toast({ title: "Joined server!" });
    navigate(`/server/${serverId}`);
  };

  if (authLoading || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invite Invalid</CardTitle>
            <CardDescription>
              This invite may have expired or reached its maximum number of uses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={serverInfo?.icon_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                <Users className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>You've been invited to join a server</CardTitle>
          <CardDescription>Click below to accept the invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleJoin}
            disabled={status === "joining"}
            className="w-full"
          >
            {status === "joining" ? (
              <><Loader2 className="h-4 w-4 me-2 animate-spin" /> Joining...</>
            ) : (
              "Accept Invite"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteJoin;
