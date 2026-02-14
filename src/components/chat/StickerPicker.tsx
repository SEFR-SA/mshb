import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sticker, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface StickerPickerProps {
  onStickerSelect: (url: string) => void;
}

const STICKER_CATEGORIES = [
  { key: "trending", label: "🔥" },
  { key: "greetings", label: "👋" },
  { key: "love", label: "💕" },
  { key: "celebrations", label: "🎉" },
  { key: "reactions", label: "😮" },
];

const StickerPicker = ({ onStickerSelect }: StickerPickerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [stickers, setStickers] = useState<any[]>([]);
  const [customStickers, setCustomStickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("giphy");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGiphyStickers = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { type: "stickers", limit: "30" };
      if (query) {
        params.q = query;
      } else {
        const cat = STICKER_CATEGORIES[activeCategory];
        if (cat.key === "trending") {
          params.trending = "true";
        } else {
          params.q = cat.key;
        }
      }
      const queryStr = new URLSearchParams(params).toString();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/giphy-proxy?${queryStr}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const json = await res.json();
      setStickers(json.results || []);
    } catch {
      setStickers([]);
    }
    setLoading(false);
  }, [activeCategory]);

  const fetchCustomStickers = useCallback(async () => {
    const { data } = await supabase.from("custom_stickers").select("*").order("created_at", { ascending: false }) as any;
    setCustomStickers(data || []);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (tab === "giphy") {
      if (search.trim()) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchGiphyStickers(search.trim()), 400);
      } else {
        fetchGiphyStickers();
      }
    } else {
      fetchCustomStickers();
    }
    return () => clearTimeout(debounceRef.current);
  }, [open, search, activeCategory, tab, fetchGiphyStickers, fetchCustomStickers]);

  const handleSelect = (url: string) => {
    onStickerSelect(url);
    setOpen(false);
    setSearch("");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("files.tooLarge"), variant: "destructive" });
      return;
    }
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}_${sanitized}`;
    const { error: uploadError } = await supabase.storage.from("stickers").upload(path, file);
    if (uploadError) {
      toast({ title: t("common.error"), variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(path);
    await (supabase.from("custom_stickers") as any).insert({
      user_id: user.id,
      name: file.name,
      image_url: urlData.publicUrl,
    });
    toast({ title: t("sticker.uploadSuccess") });
    fetchCustomStickers();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteCustom = async (id: string, imageUrl: string) => {
    // Extract path from URL
    const urlParts = imageUrl.split("/stickers/");
    if (urlParts[1]) {
      await supabase.storage.from("stickers").remove([urlParts[1]]);
    }
    await (supabase.from("custom_stickers") as any).delete().eq("id", id);
    toast({ title: t("sticker.deleteSuccess") });
    fetchCustomStickers();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button" title={t("sticker.title")}>
          <Sticker className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" side="top" align="start">
        <div className="flex flex-col h-[400px]">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-2 mt-2 shrink-0">
              <TabsTrigger value="giphy" className="text-xs">GIPHY</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">{t("sticker.myStickers")}</TabsTrigger>
            </TabsList>

            <TabsContent value="giphy" className="flex-1 flex flex-col min-h-0 mt-0">
              <div className="p-2 border-b border-border">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("sticker.search")}
                  className="h-8 text-sm"
                />
              </div>

              {!search.trim() && (
                <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border overflow-x-auto">
                  {STICKER_CATEGORIES.map((cat, i) => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(i)}
                      className={`px-2 py-1 text-lg rounded hover:bg-muted transition-colors shrink-0 ${
                        activeCategory === i ? "bg-muted" : ""
                      }`}
                      type="button"
                      title={cat.key}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    {t("common.loading")}
                  </div>
                ) : stickers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    {t("mentions.noResults")}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {stickers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelect(s.url)}
                        className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer bg-muted/30 p-1"
                        type="button"
                      >
                        <img src={s.preview || s.url} alt={s.title} className="w-full h-auto object-contain" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-1 border-t border-border text-center">
                <span className="text-[10px] text-muted-foreground">{t("gif.poweredBy")}</span>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="flex-1 flex flex-col min-h-0 mt-0">
              <div className="p-2 border-b border-border">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {t("sticker.upload")}
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {customStickers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    {t("mentions.noResults")}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {customStickers.map((s: any) => (
                      <div key={s.id} className="relative group">
                        <button
                          onClick={() => handleSelect(s.image_url)}
                          className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer bg-muted/30 p-1 w-full"
                          type="button"
                        >
                          <img src={s.image_url} alt={s.name} className="w-full h-auto object-contain" loading="lazy" />
                        </button>
                        {user && s.user_id === user.id && (
                          <button
                            onClick={() => handleDeleteCustom(s.id, s.image_url)}
                            className="absolute top-0 end-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            type="button"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StickerPicker;
