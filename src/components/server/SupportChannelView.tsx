import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy, Mail, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  serverId: string;
  channelId: string;
  channelName: string;
}

const SupportChannelView = ({ serverId, channelId, channelName }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_ticket", {
        p_server_id: serverId,
        p_support_channel_id: channelId,
      } as any);

      if (error) {
        if (error.message?.includes("already have an open ticket")) {
          toast({ title: t("tickets.alreadyOpen"), variant: "destructive" });
        } else {
          toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        }
        setCreating(false);
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (result?.channel_id) {
        toast({
          title: t("tickets.created", { number: String(result.ticket_number).padStart(4, "0") }),
        });
        navigate(`/server/${serverId}/channel/${result.channel_id}`);
      }
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 flex flex-col items-center text-center gap-5">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{t("tickets.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("tickets.description")}
            </p>
          </div>
          <Button
            onClick={handleCreateTicket}
            disabled={creating}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Mail className="h-4 w-4 me-2" />
            )}
            {t("tickets.createButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportChannelView;
