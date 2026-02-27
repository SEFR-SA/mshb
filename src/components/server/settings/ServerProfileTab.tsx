import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  serverId: string;
  serverName: string;
  setServerName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  iconUrl: string;
  setIconUrl: (url: string) => void;
  bannerUrl: string;
  setBannerUrl: (url: string) => void;
  canEdit: boolean;
  userId?: string;
}

const ServerProfileTab = ({
  serverId,
  serverName,
  setServerName,
  description,
  setDescription,
  iconUrl,
  setIconUrl,
  bannerUrl,
  setBannerUrl,
  canEdit,
  userId,
}: Props) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, path: string) => {
    const ext = file.name.split(".").pop();
    const filePath = `${serverId}/${path}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("server-assets").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("server-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const url = await uploadImage(file, "icon");
      setIconUrl(url);
      await supabase.from("servers" as any).update({ icon_url: url } as any).eq("id", serverId);
      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, "banner");
      setBannerUrl(url);
      await supabase.from("servers" as any).update({ banner_url: url } as any).eq("id", serverId);
      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!serverName.trim()) return;
    setSaving(true);
    try {
      await supabase.from("servers" as any).update({ name: serverName.trim(), description: description.trim() } as any).eq("id", serverId);
      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: userId,
        action_type: "server_updated",
        changes: { field: "profile", new_name: serverName.trim() },
      } as any);
      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("serverSettings.serverProfile")}</h2>

      {/* Banner */}
      <div className="relative">
        <div
          className="h-32 rounded-lg bg-muted bg-cover bg-center cursor-pointer group"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}
          onClick={() => canEdit && bannerInputRef.current?.click()}
        >
          {canEdit && (
            <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              {uploadingBanner ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            </div>
          )}
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

        {/* Icon overlay */}
        <div className="absolute -bottom-8 start-4">
          <div className="relative cursor-pointer group" onClick={() => canEdit && iconInputRef.current?.click()}>
            <Avatar className="h-16 w-16 border-4 border-background">
              <AvatarImage src={iconUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {serverName.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {canEdit && (
              <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                {uploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </div>
            )}
          </div>
          <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
        </div>
      </div>

      <div className="pt-8 space-y-4">
        {/* Server name */}
        <div className="space-y-2">
          <Label>{t("servers.serverName")}</Label>
          <Input value={serverName} onChange={(e) => setServerName(e.target.value)} disabled={!canEdit} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t("serverSettings.description")}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            placeholder={t("serverSettings.descriptionPlaceholder")}
            rows={3}
          />
        </div>

        {canEdit && (
          <Button onClick={handleSave} disabled={saving || !serverName.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            {t("actions.save")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServerProfileTab;
