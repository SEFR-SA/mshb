import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinServerDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);
    try {
      const { data: server } = await supabase
        .from("servers" as any)
        .select("id")
        .eq("invite_code", code.trim())
        .maybeSingle();
      if (!server) {
        toast({ title: t("servers.invalidCode"), variant: "destructive" });
        setLoading(false);
        return;
      }
      const serverId = (server as any).id;
      await supabase.from("server_members" as any).insert({
        server_id: serverId,
        user_id: user.id,
        role: "member",
      } as any);
      setCode("");
      onOpenChange(false);
      navigate(`/server/${serverId}`);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("servers.joinServer")}</DialogTitle>
          <DialogDescription>{t("servers.joinDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder={t("servers.inviteCodePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <Button onClick={handleJoin} disabled={!code.trim() || loading} className="w-full">
            {t("servers.joinServer")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinServerDialog;
