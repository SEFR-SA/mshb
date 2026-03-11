import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, BookOpen, Megaphone, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  onSuccess: () => void;
}

interface Channel {
  id: string;
  name: string;
}

const CREATE_NEW = "__create__";

const EnableCommunityModal = ({ open, onOpenChange, serverId, onSuccess }: Props) => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rulesChannel, setRulesChannel] = useState(CREATE_NEW);
  const [updatesChannel, setUpdatesChannel] = useState(CREATE_NEW);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("channels" as any).select("id, name").eq("server_id", serverId).eq("type", "text").then(({ data }) => {
      if (data) setChannels(data as any);
    });
  }, [open, serverId]);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("enable_community" as any, {
      p_server_id: serverId,
      p_rules_channel_id: rulesChannel === CREATE_NEW ? null : rulesChannel,
      p_updates_channel_id: updatesChannel === CREATE_NEW ? null : updatesChannel,
    });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("community.enabled") });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
        <div className="flex flex-col sm:flex-row min-h-[380px]">
          {/* Left decorative panel */}
          <div className="hidden sm:flex flex-col items-center justify-center w-[240px] shrink-0 bg-primary/5 p-8 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-center leading-snug">{t("community.setupTitle")}</h3>
            <div className="flex gap-3 mt-4 opacity-60">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold">{t("community.setupBasicsTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("community.setupBasicsSubtitle")}</p>
            </div>

            {/* Rules Channel */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                {t("community.rulesChannel")}
              </label>
              <Select value={rulesChannel} onValueChange={setRulesChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={CREATE_NEW}>{t("community.createForMe")}</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Announcements Channel */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                {t("community.updatesChannel")}
              </label>
              <Select value={updatesChannel} onValueChange={setUpdatesChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={CREATE_NEW}>{t("community.createForMe")}</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("community.enableButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnableCommunityModal;
