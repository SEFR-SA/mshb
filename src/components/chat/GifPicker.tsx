import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface GifPickerProps {
  onGifSelect: (url: string) => void;
}

const GIF_CATEGORIES = [
  { key: "trending", label: "🔥" },
  { key: "reactions", label: "😂" },
  { key: "love", label: "❤️" },
  { key: "sports", label: "⚽" },
  { key: "entertainment", label: "🎬" },
  { key: "memes", label: "🐸" },
];

const GifPicker = ({ onGifSelect }: GifPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { type: "gifs", limit: "30" };
      if (query) {
        params.q = query;
      } else {
        const cat = GIF_CATEGORIES[activeCategory];
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
      setGifs(json.results || []);
    } catch {
      setGifs([]);
    }
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    if (!open) return;
    if (search.trim()) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchGifs(search.trim()), 400);
    } else {
      fetchGifs();
    }
    return () => clearTimeout(debounceRef.current);
  }, [open, search, activeCategory, fetchGifs]);

  const handleSelect = (url: string) => {
    onGifSelect(url);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button" title={t("gif.title")}>
          <span className="text-sm font-bold text-muted-foreground">GIF</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" side="top" align="start">
        <div className="flex flex-col h-[400px]">
          <div className="p-2 border-b border-border">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("gif.search")}
              className="h-8 text-sm"
            />
          </div>

          {!search.trim() && (
            <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border overflow-x-auto">
              {GIF_CATEGORIES.map((cat, i) => (
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
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                {t("mentions.noResults")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 p-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif.url)}
                    className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                    type="button"
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt={gif.title}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-1 border-t border-border text-center">
            <span className="text-[10px] text-muted-foreground">{t("gif.poweredBy")}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;
