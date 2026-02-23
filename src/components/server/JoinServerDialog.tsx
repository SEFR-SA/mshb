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

      // Try new invite system first, then fall back to legacy
      let serverId: string | null = null;
      const { data: newId } = await supabase.rpc("get_server_id_by_invite_link", { p_code: inviteCode });
      if (newId) {
        // Use the invite (increment counter)
        await supabase.rpc("use_invite", { p_code: inviteCode });
        serverId = newId;
      } else {
        const { data: legacyId } = await supabase.rpc("get_server_id_by_invite", { p_code: inviteCode });
        serverId = legacyId;
      }
      if (!serverId) {
        toast({ title: t("servers.invalidCode"), variant: "destructive" });
        setLoading(false);
        return;
      }
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
