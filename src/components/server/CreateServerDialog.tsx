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

const CreateServerDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    try {
      const { data: server, error } = await supabase
        .from("servers" as any)
        .insert({ name: name.trim(), owner_id: user.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      const serverId = (server as any).id;

      await supabase.from("server_members" as any).insert({
        server_id: serverId,
        user_id: user.id,
        role: "owner",
      } as any);

      await supabase.from("channels" as any).insert({
        server_id: serverId,
        name: "general",
        type: "text",
        category: "Text Channels",
      } as any);

      setName("");
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
          <DialogTitle>{t("servers.create")}</DialogTitle>
          <DialogDescription>{t("servers.createDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder={t("servers.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            maxLength={100}
          />
          <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full">
            {t("servers.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServerDialog;
