import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface StickerPickerProps {
  onStickerSelect: (url: string) => void;
  serverId?: string;
}

const STICKER_CATEGORIES = [
  { key: "trending", label: "🔥" },
  { key: "greetings", label: "👋" },
  { key: "love", label: "💕" },
  { key: "celebrations", label: "🎉" },
  { key: "reactions", label: "😮" },
];

const StickerPicker = ({ onStickerSelect, serverId }: StickerPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [stickers, setStickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverStickers, setServerStickers] = useState<{ id: string; name: string; url: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;
    supabase
      .from("server_stickers" as any)
      .select("id, name, url")
      .eq("server_id", serverId)
      .order("created_at")
      .then(({ data }) => setServerStickers((data as any[]) || []));
  }, [serverId]);

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

  useEffect(() => {
    if (!open) return;
    if (search.trim()) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchGiphyStickers(search.trim()), 400);
    } else {
      fetchGiphyStickers();
    }
    return () => clearTimeout(debounceRef.current);
  }, [open, search, activeCategory, fetchGiphyStickers]);

  const handleSelect = (url: string) => {
    onStickerSelect(url);
    setOpen(false);
    setSearch("");
  };

  const defaultTab = serverId && serverStickers.length > 0 ? "server" : "discover";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button" title={t("sticker.title")}>
          <Sticker className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" side="top" align="start">
        <Tabs defaultValue={defaultTab} className="flex flex-col h-[400px]">
          <TabsList className="w-full rounded-none border-b border-border h-9 shrink-0">
            {serverId && (
              <TabsTrigger value="server" className="flex-1 text-xs h-8">
                {t("sticker.serverTab", "Server")}
              </TabsTrigger>
            )}
            <TabsTrigger value="discover" className="flex-1 text-xs h-8">
              {t("sticker.discoverTab", "Discover")}
            </TabsTrigger>
          </TabsList>

          {serverId && (
            <TabsContent value="server" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                {serverStickers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    {t("sticker.noServerStickers", "No server stickers yet")}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {serverStickers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelect(s.url)}
                        className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer bg-muted/30 p-1"
                        type="button"
                        title={s.name}
                      >
                        <img src={s.url} alt={s.name} className="w-full h-auto object-contain" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="discover" className="flex-1 overflow-hidden m-0 flex flex-col">
            <div className="p-2 border-b border-border shrink-0">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("sticker.search")}
                className="h-8 text-sm"
              />
            </div>

            {!search.trim() && (
              <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border overflow-x-auto shrink-0">
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
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default StickerPicker;
