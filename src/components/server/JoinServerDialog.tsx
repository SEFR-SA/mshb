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
      // Extract code from URL if pasted as full link
      let inviteCode = code.trim();
      const urlMatch = inviteCode.match(/\/invite\/([A-Za-z0-9]+)$/);
      if (urlMatch) inviteCode = urlMatch[1];

      // use_invite atomically validates, increments, and inserts membership
      const { data: serverId, error } = await supabase.rpc("use_invite", { p_code: inviteCode });
      if (error || !serverId) {
        // Fall back to legacy invite_code on servers table
        const { data: legacyId } = await supabase.rpc("get_server_id_by_invite", { p_code: inviteCode });
        if (!legacyId) {
          toast({ title: t("servers.invalidCode"), variant: "destructive" });
          setLoading(false);
          return;
        }
        // Legacy: insert membership client-side (no invites row to validate)
        await supabase.from("server_members" as any).insert({
          server_id: legacyId,
          user_id: user.id,
          role: "member",
        } as any);
        setCode("");
        onOpenChange(false);
        navigate(`/server/${legacyId}`);
        setLoading(false);
        return;
      }

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
