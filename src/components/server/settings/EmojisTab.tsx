import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServerOwnerIsPro } from "@/hooks/useServerOwnerIsPro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload } from "lucide-react";

// Limit is dynamic based on server owner's Pro status — set inside component

interface EmojiItem {
  id: string;
  name: string;
  url: string;
  uploaded_by: string;
  created_at: string;
  uploaderName: string;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const EmojisTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ownerIsPro = useServerOwnerIsPro(serverId);
  const EMOJI_LIMIT = ownerIsPro ? 250 : 50;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<EmojiItem[]>([]);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmojis = async () => {
    const { data: rows } = await supabase
      .from("server_emojis" as any)
      .select("*")
      .eq("server_id", serverId)
      .order("created_at");

    const list = (rows as any[]) || [];
    if (list.length === 0) {
      setItems([]);
      return;
    }

    const uploaderIds = [...new Set(list.map((r) => r.uploaded_by))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", uploaderIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setItems(
      list.map((r) => {
        const p = profileMap.get(r.uploaded_by);
        return {
          ...r,
          uploaderName: p?.display_name || p?.username || "Unknown",
        };
      })
    );
  };

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    fetchEmojis().finally(() => setLoading(false));
  }, [serverId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
    const baseName = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setPendingFile(file);
    setPendingName(baseName);
    setNameDialogOpen(true);
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile || !pendingName.trim()) return;
    setUploading(true);
    setNameDialogOpen(false);
    try {
      const ext = pendingFile.name.split(".").pop();
      const filePath = `${serverId}/emojis/${Date.now()}_${pendingName.trim()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("server-assets")
        .upload(filePath, pendingFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("server-assets").getPublicUrl(filePath);
      await supabase.from("server_emojis" as any).insert({
        server_id: serverId,
        name: pendingName.trim(),
        url: urlData.publicUrl,
        uploaded_by: user?.id,
      } as any);

      toast({ title: t("profile.saved") });
      await fetchEmojis();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setUploading(false);
      setPendingFile(null);
      setPendingName("");
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("server_emojis" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({ title: t("channels.deleted") });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("serverSettings.emojis")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("serverSettings.emojisUsed", { count: items.length, max: EMOJI_LIMIT })}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || items.length >= EMOJI_LIMIT}
              size="sm"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Upload className="h-4 w-4 me-2" />
              )}
              {uploading ? t("serverSettings.uploading") : t("serverSettings.uploadEmoji")}
            </Button>
            {items.length >= EMOJI_LIMIT && !ownerIsPro && (
              <p className="text-xs text-muted-foreground">{t("pro.upgradeForMore")}</p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("serverSettings.noEmojis")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("serverSettings.tableColImage")}</TableHead>
                <TableHead>{t("serverSettings.tableColName")}</TableHead>
                <TableHead>{t("serverSettings.uploadedBy")}</TableHead>
                {canEdit && <TableHead className="w-16">{t("serverSettings.tableColActions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-8 w-8 object-contain rounded"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">:{item.name}:</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.uploaderName}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("serverSettings.emojiName")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{t("serverSettings.emojiName")}</Label>
              <Input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder={t("serverSettings.emojiNamePlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && handleUploadConfirm()}
              />
              <p className="text-xs text-muted-foreground">{t("serverSettings.emojiNameDesc")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNameDialogOpen(false); setPendingFile(null); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUploadConfirm} disabled={!pendingName.trim()}>
              {t("serverSettings.uploadEmojiConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmojisTab;
