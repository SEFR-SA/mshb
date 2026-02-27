import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload, Play, Square, Music } from "lucide-react";

interface SoundItem {
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

const SoundboardTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<SoundItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSounds = async () => {
    const { data: rows } = await supabase
      .from("server_soundboard" as any)
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
    fetchSounds().finally(() => setLoading(false));
  }, [serverId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (item: SoundItem) => {
    if (playingId === item.id) {
      // Stop current sound
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(item.url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(item.id);
  };

  const handleOpenDialog = () => {
    setPendingFile(null);
    setPendingName("");
    setDialogOpen(true);
  };

  const handleDialogFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    setPendingFile(file);
    setPendingName(baseName);
  };

  const handleUpload = async () => {
    if (!pendingFile || !pendingName.trim()) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      const safeName = pendingName.trim().replace(/\s+/g, "_");
      const filePath = `${serverId}/sounds/${Date.now()}_${safeName}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("server-assets")
        .upload(filePath, pendingFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("server-assets").getPublicUrl(filePath);
      await supabase.from("server_soundboard" as any).insert({
        server_id: serverId,
        name: pendingName.trim(),
        url: urlData.publicUrl,
        uploaded_by: user?.id,
      } as any);

      toast({ title: t("profile.saved") });
      setDialogOpen(false);
      await fetchSounds();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Stop playback if this sound is playing
    if (playingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
    await supabase.from("server_soundboard" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({ title: t("channels.deleted") });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("serverSettings.soundboard")}</h2>
        {canEdit && (
          <Button onClick={handleOpenDialog} size="sm">
            <Upload className="h-4 w-4 me-2" />
            {t("serverSettings.uploadSound")}
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
          {t("serverSettings.noSounds")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>{t("serverSettings.tableColName")}</TableHead>
                <TableHead>{t("serverSettings.uploadedBy")}</TableHead>
                {canEdit && <TableHead className="w-16">{t("serverSettings.tableColActions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePlay(item)}
                    >
                      {playingId === item.id ? (
                        <Square className="h-4 w-4 fill-current" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("serverSettings.uploadSound")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File picker */}
            <div className="space-y-2">
              <Label>{t("serverSettings.uploadSound")}</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Music className="h-4 w-4 me-2" />
                {pendingFile ? pendingFile.name : t("serverSettings.uploadSound")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/ogg,.mp3,.ogg"
                className="hidden"
                onChange={handleDialogFileChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>{t("serverSettings.soundName")}</Label>
              <Input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder={t("serverSettings.soundNamePlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && handleUpload()}
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

export default SoundboardTab;
