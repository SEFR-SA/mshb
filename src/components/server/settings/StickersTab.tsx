import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload, ImageIcon } from "lucide-react";

const MAX_SIZE_KB = 600;

interface StickerItem {
  id: string;
  name: string;
  url: string;
  format: string;
  uploaded_by: string;
  created_at: string;
  uploaderName: string;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const getFormat = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "gif") return "GIF";
  if (ext === "apng") return "APNG";
  return "PNG";
};

const StickersTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<StickerItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [pendingFormat, setPendingFormat] = useState("PNG");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStickers = async () => {
    const { data: rows } = await supabase
      .from("server_stickers" as any)
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
    fetchStickers().finally(() => setLoading(false));
  }, [serverId]);

  const handleOpenDialog = () => {
    setPendingFile(null);
    setPendingName("");
    setPreviewUrl("");
    setPendingFormat("PNG");
    setDialogOpen(true);
  };

  const handleDialogFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_KB * 1024) {
      toast({ title: t("serverSettings.fileTooLarge", { size: MAX_SIZE_KB }), variant: "destructive" });
      e.target.value = "";
      return;
    }

    // Revoke previous object URL to avoid memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const objectUrl = URL.createObjectURL(file);
    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    setPreviewUrl(objectUrl);
    setPendingFile(file);
    setPendingName(baseName);
    setPendingFormat(getFormat(file.name));
  };

  const handleUpload = async () => {
    if (!pendingFile || !pendingName.trim()) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      const safeName = pendingName.trim().replace(/\s+/g, "_");
      const filePath = `${serverId}/stickers/${Date.now()}_${safeName}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("server-assets")
        .upload(filePath, pendingFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("server-assets").getPublicUrl(filePath);
      await supabase.from("server_stickers" as any).insert({
        server_id: serverId,
        name: pendingName.trim(),
        url: urlData.publicUrl,
        format: pendingFormat,
        uploaded_by: user?.id,
      } as any);

      toast({ title: t("profile.saved") });
      setDialogOpen(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      await fetchStickers();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("server_stickers" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({ title: t("channels.deleted") });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("serverSettings.stickers")}</h2>
        {canEdit && (
          <Button onClick={handleOpenDialog} size="sm">
            <Upload className="h-4 w-4 me-2" />
            {t("serverSettings.uploadSticker")}
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("serverSettings.noStickers")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("serverSettings.tableColImage")}</TableHead>
                <TableHead>{t("serverSettings.tableColName")}</TableHead>
                <TableHead className="w-24">{t("serverSettings.stickerFormat")}</TableHead>
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
                      className="h-10 w-10 object-contain rounded"
                    />
                  </TableCell>
                  <TableCell className="text-sm font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{item.format}</Badge>
                  </TableCell>
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

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("serverSettings.uploadSticker")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File picker */}
            <div className="space-y-2">
              <Label>{t("serverSettings.tableColImage")}</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <ImageIcon className="h-4 w-4 me-2" />
                {pendingFile ? pendingFile.name : t("serverSettings.uploadSticker")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.apng,image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleDialogFileChange}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, APNG · {t("serverSettings.fileTooLarge", { size: MAX_SIZE_KB })}
              </p>
            </div>

            {/* Dual preview */}
            {previewUrl && (
              <div className="space-y-2">
                <Label>{t("serverSettings.stickerPreview")}</Label>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-zinc-900 flex items-center justify-center p-4 min-h-[96px]">
                    <img src={previewUrl} alt="preview" className="max-h-16 max-w-full object-contain" />
                  </div>
                  <div className="flex-1 rounded-lg bg-white border flex items-center justify-center p-4 min-h-[96px]">
                    <img src={previewUrl} alt="preview" className="max-h-16 max-w-full object-contain" />
                  </div>
                </div>
                <div className="flex justify-center gap-8 text-xs text-muted-foreground">
                  <span>{t("serverSettings.stickerPreviewDark")}</span>
                  <span>{t("serverSettings.stickerPreviewLight")}</span>
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label>{t("serverSettings.stickerName")}</Label>
              <Input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder={t("serverSettings.stickerNamePlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={!pendingFile || !pendingName.trim() || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              {uploading ? t("serverSettings.uploading") : t("serverSettings.uploadEmojiConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StickersTab;
