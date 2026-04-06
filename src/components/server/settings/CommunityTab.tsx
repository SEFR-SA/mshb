import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Megaphone, BookOpen, LifeBuoy, Crown, AlertTriangle } from "lucide-react";
import EnableCommunityModal from "../EnableCommunityModal";
import { UnsavedChangesBar } from "@/components/settings/UnsavedChangesBar";

interface Props {
  serverId: string;
  isCommunity: boolean;
  rulesChannelId: string | null;
  updatesChannelId: string | null;
  onRefresh: () => void;
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

const CommunityTab = ({ serverId, isCommunity, rulesChannelId, updatesChannelId, onRefresh }: Props) => {
  const { t } = useTranslation();

  if (!isCommunity) {
    return <PromotionalView serverId={serverId} onRefresh={onRefresh} />;
  }

  return <ManagementView serverId={serverId} rulesChannelId={rulesChannelId} updatesChannelId={updatesChannelId} onRefresh={onRefresh} />;
};

/* ── Promotional View ── */
const PromotionalView = ({ serverId, onRefresh }: { serverId: string; onRefresh: () => void }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const features = [
    { icon: <Megaphone className="h-8 w-8 text-primary" />, title: t("community.featureAnnouncements"), desc: t("community.featureAnnouncementsDesc") },
    { icon: <LifeBuoy className="h-8 w-8 text-primary" />, title: t("community.featureTickets"), desc: t("community.featureTicketsDesc") },
    { icon: <BookOpen className="h-8 w-8 text-primary" />, title: t("community.featureRules"), desc: t("community.featureRulesDesc") },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("community.title")}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{t("community.subtitle")}</p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => setShowModal(true)}>
          {t("community.enableButton")}
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="bg-background border-border/50">
            <CardContent className="p-5 text-center space-y-3">
              <div className="flex justify-center">{f.icon}</div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <EnableCommunityModal
        open={showModal}
        onOpenChange={setShowModal}
        serverId={serverId}
        onSuccess={onRefresh}
      />
    </div>
  );
};

/* ── Management View ── */
const ManagementView = ({ serverId, rulesChannelId, updatesChannelId, onRefresh }: { serverId: string; rulesChannelId: string | null; updatesChannelId: string | null; onRefresh: () => void }) => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rules, setRules] = useState(rulesChannelId || "");
  const [updates, setUpdates] = useState(updatesChannelId || "");
  const [savedRules, setSavedRules] = useState(rulesChannelId || "");
  const [savedUpdates, setSavedUpdates] = useState(updatesChannelId || "");
  const [showDisable, setShowDisable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("channels" as any).select("id, name, type").eq("server_id", serverId).eq("type", "text").then(({ data }) => {
      if (data) setChannels(data as any);
    });
  }, [serverId]);

  useEffect(() => {
    setRules(rulesChannelId || "");
    setUpdates(updatesChannelId || "");
    setSavedRules(rulesChannelId || "");
    setSavedUpdates(updatesChannelId || "");
  }, [rulesChannelId, updatesChannelId]);

  const hasChanges = rules !== savedRules || updates !== savedUpdates;

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("servers" as any).update({ rules_channel_id: rules, public_updates_channel_id: updates } as any).eq("id", serverId);
    setSaving(false);
    setSavedRules(rules);
    setSavedUpdates(updates);
    toast({ title: t("common.saved") });
    onRefresh();
  };

  const handleReset = () => {
    setRules(savedRules);
    setUpdates(savedUpdates);
  };

  const handleDisable = async () => {
    const { error } = await supabase.rpc("disable_community" as any, { p_server_id: serverId });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("community.disabled") });
      onRefresh();
    }
    setShowDisable(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">{t("community.settingsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("community.settingsSubtitle")}</p>
      </div>

      {/* Rules Channel */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("community.rulesChannel")}</label>
        <Select value={rules} onValueChange={setRules}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Updates Channel */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("community.updatesChannel")}</label>
        <Select value={updates} onValueChange={setUpdates}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Danger Zone */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h3 className="font-semibold text-sm">{t("community.disableTitle")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("community.disableDesc")}</p>
        <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)}>
          {t("community.disableButton")}
        </Button>
      </div>

      <AlertDialog open={showDisable} onOpenChange={setShowDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("community.disableConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("community.disableConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("community.disableButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesBar show={hasChanges} onSave={handleSave} onReset={handleReset} />
    </div>
  );
};

export default CommunityTab;
