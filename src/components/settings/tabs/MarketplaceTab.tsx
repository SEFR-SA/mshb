import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Check, Loader2, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreatorStudio from "./CreatorStudio";

type Category = "all" | "banner" | "avatar" | "soundboard" | "sticker" | "emoji" | "tag";

interface MarketplaceItem {
  id: string;
  name: string;
  category: Exclude<Category, "all">;
  type: "static" | "gif" | "free";
  price_sar: number;
  thumbnail_url: string;
  asset_url: string;
}

// Hardcoded storefront items — swap thumbnail_url / asset_url for real assets later
const MOCK_ITEMS: MarketplaceItem[] = [
  // ── Banners ──────────────────────────────────────────────────────
  { id: "banner_static_1", name: "Desert Dunes",   category: "banner",     type: "static", price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "banner_gif_1",    name: "Aurora Waves",   category: "banner",     type: "gif",    price_sar: 2.29, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "banner_free_1",   name: "Simple Dark",    category: "banner",     type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  // ── Avatars ───────────────────────────────────────────────────────
  { id: "avatar_static_1", name: "Geometric Star", category: "avatar",     type: "static", price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "avatar_gif_1",    name: "Neon Pulse",     category: "avatar",     type: "gif",    price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "avatar_free_1",   name: "Classic Circle", category: "avatar",     type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  // ── Soundboard ───────────────────────────────────────────────────
  { id: "sound_premium_1", name: "Crowd Cheer",    category: "soundboard", type: "static", price_sar: 3.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sound_premium_2", name: "Air Horn",       category: "soundboard", type: "static", price_sar: 3.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sound_free_1",    name: "Soft Chime",     category: "soundboard", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  // ── Stickers ──────────────────────────────────────────────────────
  { id: "sticker_static_1", name: "Thumbs Up",    category: "sticker",    type: "static", price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sticker_gif_1",    name: "Bouncing Star", category: "sticker",    type: "gif",    price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sticker_free_1",   name: "Heart",         category: "sticker",    type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  // ── Emojis ───────────────────────────────────────────────────────
  { id: "emoji_static_1", name: "Flame Pack",     category: "emoji",      type: "static", price_sar: 0.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "emoji_gif_1",    name: "Rainbow Burst",  category: "emoji",      type: "gif",    price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "emoji_free_1",   name: "Basic Set",      category: "emoji",      type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  // ── Tags (Custom Server Badges) ───────────────────────────────────
  { id: "tag_static_1", name: "Gold Crown",       category: "tag",        type: "static", price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "tag_gif_1",    name: "Rainbow Badge",    category: "tag",        type: "gif",    price_sar: 2.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "tag_free_1",   name: "Verified Mark",    category: "tag",        type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
];

// Gradient fallbacks shown when thumbnail_url fails to load (e.g. Electron file:// origin)
const CATEGORY_GRADIENTS: Record<Exclude<Category, "all">, string> = {
  banner:     "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  avatar:     "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  soundboard: "linear-gradient(135deg, #1a1a2e 0%, #4a0080 100%)",
  sticker:    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  emoji:      "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
  tag:        "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
};

const CATEGORY_KEYS: { id: Category; labelKey: string }[] = [
  { id: "all",        labelKey: "marketplace.all" },
  { id: "banner",     labelKey: "marketplace.banners" },
  { id: "avatar",     labelKey: "marketplace.avatars" },
  { id: "soundboard", labelKey: "marketplace.soundboard" },
  { id: "sticker",    labelKey: "marketplace.stickers" },
  { id: "emoji",      labelKey: "marketplace.emojis" },
  { id: "tag",        labelKey: "marketplace.tags" },
];

// Decorative audio waveform bars for soundboard cards
const WaveformSVG = () => (
  <svg viewBox="0 0 64 20" className="h-5 w-16 text-primary/50 shrink-0" aria-hidden="true">
    {[3, 6, 10, 14, 18, 14, 8, 12, 16, 10, 6, 14, 9, 5, 12].map((h, i) => (
      <rect key={i} x={i * 4 + 1} y={(20 - h) / 2} width="2.5" height={h} rx="1" fill="currentColor" />
    ))}
  </svg>
);

const MarketplaceTab = () => {
  const { t } = useTranslation();
  const { user, profile, purchasedItemIds, equippedItems, refreshPurchases, refreshProfile } = useAuth();
  const [view, setView]             = useState<"storefront" | "creator">("storefront");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const handleCreatorTabClick = () => {
    if (!profile?.is_pro) {
      toast({ title: t("pro.upgradeToast") });
      return;
    }
    setView("creator");
  };

  const filteredItems = MOCK_ITEMS
    .filter((item) => activeCategory === "all" || item.category === activeCategory)
    .filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()));

  const soundItems = filteredItems.filter((item) => item.category === "soundboard");
  const gridItems  = filteredItems.filter((item) => item.category !== "soundboard");

  const isOwned    = (item: MarketplaceItem) => item.price_sar === 0 || purchasedItemIds.includes(item.id);
  const isEquipped = (item: MarketplaceItem) => equippedItems[item.category] === item.id;

  const handleBuy = async (item: MarketplaceItem) => {
    if (!user) return;
    setBuying(item.id);
    const { error } = await supabase.from("user_purchases" as any).insert({
      user_id: user.id,
      item_id: item.id,
      transaction_id: `mock_${Date.now()}`,
    });
    setBuying(null);
    if (error) {
      toast({ title: t("marketplace.purchaseFailed"), variant: "destructive" });
      return;
    }
    toast({ title: t("marketplace.purchaseSuccess") });
    refreshPurchases();
  };

  const handleEquip = async (item: MarketplaceItem) => {
    if (!user) return;
    setEquipping(item.id);
    await supabase.from("user_equipped" as any).upsert({
      user_id: user.id,
      category: item.category,
      item_id: item.id,
      equipped_at: new Date().toISOString(),
    });
    if (item.category === "avatar") {
      await supabase.from("profiles").update({ avatar_url: item.asset_url } as any).eq("user_id", user.id);
      await refreshProfile();
    } else if (item.category === "banner") {
      await supabase.from("profiles").update({ banner_url: item.asset_url } as any).eq("user_id", user.id);
      await refreshProfile();
    }
    setEquipping(null);
    toast({ title: t("marketplace.equipSuccess") });
    refreshPurchases();
  };

  const showSoundboard = (activeCategory === "all" || activeCategory === "soundboard") && soundItems.length > 0;
  const showGrid       = gridItems.length > 0;

  return (
    <div className="space-y-6 pb-4">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{t("marketplace.title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{t("marketplace.subtitle")}</p>
        </div>
      </div>

      {/* ── Storefront / Creator Studio toggle ───────────────────── */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setView("storefront")}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all",
            view === "storefront"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("marketplace.storefront")}
        </button>
        <button
          onClick={handleCreatorTabClick}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all",
            view === "creator"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("marketplace.creatorStudio")}
        </button>
      </div>

      {view === "creator" ? <CreatorStudio /> : (<>

      {/* ── Sticky search + category nav ─────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 bg-background/90 backdrop-blur-sm pb-3 space-y-2 pt-1">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketplace.search")}
            className="w-full h-9 bg-muted/40 border border-border/50 rounded-lg ps-9 pe-3 text-sm placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/60 transition-colors"
          />
        </div>

        {/* Category pills — horizontally scrollable, no scrollbar */}
        <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {CATEGORY_KEYS.map(({ id, labelKey }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0",
                activeCategory === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/20 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Soundboard section ────────────────────────────────────── */}
      {showSoundboard && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-0.5">
            {t("marketplace.soundboard")}
          </p>
          <div className="space-y-2">
            {soundItems.map((item) => {
              const owned    = isOwned(item);
              const equipped = isEquipped(item);
              const loading  = buying === item.id || equipping === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md"
                >
                  {/* Play icon (decorative — no audio source wired yet) */}
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-primary" />
                  </div>

                  <WaveformSVG />

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className={cn(
                        "text-[9px] py-0 px-1.5 border-0 uppercase",
                        item.price_sar === 0
                          ? "bg-green-500/20 text-green-600"
                          : "bg-muted/60 text-muted-foreground"
                      )}>
                        {item.price_sar === 0
                          ? t("marketplace.free")
                          : item.type === "gif" ? t("marketplace.gif") : t("marketplace.static")}
                      </Badge>
                      {owned && item.price_sar > 0 && (
                        <span className="text-[9px] font-semibold text-green-500 uppercase tracking-wide">
                          {t("marketplace.owned")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {owned ? (
                    <Button
                      size="sm"
                      variant={equipped ? "secondary" : "outline"}
                      className={cn(
                        "h-8 text-xs shrink-0",
                        equipped && "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
                      )}
                      onClick={() => handleEquip(item)}
                      disabled={loading || equipped}
                    >
                      {equipping === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : equipped ? (
                        <><Check className="h-3 w-3 me-1" />{t("marketplace.equipped")}</>
                      ) : (
                        t("marketplace.equip")
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={() => handleBuy(item)}
                      disabled={loading}
                    >
                      {buying === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `${item.price_sar.toFixed(2)} ${t("marketplace.sar")}`
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main grid (banners · avatars · stickers · emojis · tags) ── */}
      {showGrid && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gridItems.map((item) => {
            const owned    = isOwned(item);
            const equipped = isEquipped(item);
            const loading  = buying === item.id || equipping === item.id;
            const isBanner = item.category === "banner";

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col",
                  isBanner ? "col-span-2" : "col-span-1"
                )}
              >
                {/* Anti-theft image container */}
                <div
                  className={cn(
                    "pointer-events-none select-none relative overflow-hidden",
                    isBanner ? "aspect-video" : "aspect-square"
                  )}
                  style={{ background: CATEGORY_GRADIENTS[item.category] }}
                >
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="w-full h-full object-cover"
                  />

                  {/* MSHB watermark — top-right, unowned paid items only */}
                  {!owned && item.price_sar > 0 && (
                    <div className="absolute top-1.5 end-1.5 bg-red-600/80 backdrop-blur-sm rounded px-1.5 py-0.5 rotate-[-8deg] shadow-md">
                      <span className="text-white font-black text-[9px] tracking-[0.2em] select-none pointer-events-none">
                        MSHB
                      </span>
                    </div>
                  )}

                  {/* Equipped checkmark — top-left */}
                  {equipped && (
                    <div className="absolute top-1.5 start-1.5 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Type badge — top-left (hidden when equipped overlay shown) */}
                  {!equipped && (
                    <div className="absolute top-1.5 start-1.5">
                      {item.price_sar === 0 ? (
                        <Badge className="text-[9px] py-0 px-1.5 bg-green-500/90 text-white border-0 uppercase">
                          {t("marketplace.free")}
                        </Badge>
                      ) : (
                        <Badge className="text-[9px] py-0 px-1.5 bg-black/60 text-white border-0 uppercase">
                          {item.type === "gif" ? t("marketplace.gif") : t("marketplace.static")}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Card info + action */}
                <div className="p-2.5 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
                    {item.price_sar > 0 && !owned && (
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {item.price_sar.toFixed(2)} {t("marketplace.sar")}
                      </p>
                    )}
                    {owned && (
                      <p className="text-[10px] text-green-500 font-semibold shrink-0">
                        {t("marketplace.owned")}
                      </p>
                    )}
                  </div>

                  {owned ? (
                    <Button
                      size="sm"
                      variant={equipped ? "secondary" : "outline"}
                      className={cn(
                        "h-7 text-xs w-full",
                        equipped && "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
                      )}
                      onClick={() => handleEquip(item)}
                      disabled={loading || equipped}
                    >
                      {equipping === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : equipped ? (
                        <><Check className="h-3 w-3 me-1" />{t("marketplace.equipped")}</>
                      ) : (
                        t("marketplace.equip")
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs w-full"
                      onClick={() => handleBuy(item)}
                      disabled={loading}
                    >
                      {buying === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `${t("marketplace.buy")} ${item.price_sar.toFixed(2)} ${t("marketplace.sar")}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!showSoundboard && !showGrid && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t("marketplace.noResults")}</p>
        </div>
      )}

      </>)}
    </div>
  );
};

export default MarketplaceTab;
