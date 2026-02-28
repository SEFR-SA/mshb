import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  { id: "banner_static_1", name: "Desert Dunes", category: "banner", type: "static", price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "banner_gif_1",    name: "Aurora Waves", category: "banner", type: "gif",    price_sar: 2.29, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "banner_free_1",   name: "Simple Dark",  category: "banner", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },

  // ── Avatars ───────────────────────────────────────────────────────
  { id: "avatar_static_1", name: "Geometric Star",  category: "avatar", type: "static", price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "avatar_gif_1",    name: "Neon Pulse",       category: "avatar", type: "gif",    price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "avatar_free_1",   name: "Classic Circle",   category: "avatar", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },

  // ── Soundboard ───────────────────────────────────────────────────
  { id: "sound_premium_1", name: "Crowd Cheer",  category: "soundboard", type: "static", price_sar: 3.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sound_premium_2", name: "Air Horn",     category: "soundboard", type: "static", price_sar: 3.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sound_free_1",    name: "Soft Chime",   category: "soundboard", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },

  // ── Stickers ──────────────────────────────────────────────────────
  { id: "sticker_static_1", name: "Thumbs Up",    category: "sticker", type: "static", price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sticker_gif_1",    name: "Bouncing Star", category: "sticker", type: "gif",    price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "sticker_free_1",   name: "Heart",         category: "sticker", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },

  // ── Emojis ───────────────────────────────────────────────────────
  { id: "emoji_static_1", name: "Flame Pack",    category: "emoji", type: "static", price_sar: 0.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "emoji_gif_1",    name: "Rainbow Burst", category: "emoji", type: "gif",    price_sar: 0.99, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "emoji_free_1",   name: "Basic Set",     category: "emoji", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },

  // ── Tags (Custom Server Badges) ───────────────────────────────────
  { id: "tag_static_1", name: "Gold Crown",    category: "tag", type: "static", price_sar: 1.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "tag_gif_1",    name: "Rainbow Badge", category: "tag", type: "gif",    price_sar: 2.49, thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
  { id: "tag_free_1",   name: "Verified Mark", category: "tag", type: "free",   price_sar: 0,    thumbnail_url: "/placeholder.svg", asset_url: "/placeholder.svg" },
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

const MarketplaceTab = () => {
  const { t } = useTranslation();
  const { user, purchasedItemIds, equippedItems, refreshPurchases, refreshProfile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [buying, setBuying] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const visibleItems = activeCategory === "all"
    ? MOCK_ITEMS
    : MOCK_ITEMS.filter((item) => item.category === activeCategory);

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

    // Record equipped state per-category
    await supabase.from("user_equipped" as any).upsert({
      user_id: user.id,
      category: item.category,
      item_id: item.id,
      equipped_at: new Date().toISOString(),
    });

    // For avatar and banner, also update the profile fields directly
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("marketplace.title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("marketplace.subtitle")}</p>
        </div>
      </div>

      {/* Category pill-bar */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_KEYS.map(({ id, labelKey }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border",
              activeCategory === id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/20 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleItems.map((item) => {
          const owned    = isOwned(item);
          const equipped = isEquipped(item);
          const loading  = buying === item.id || equipping === item.id;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-border/50 bg-card/40 overflow-hidden flex flex-col"
            >
              {/* Anti-theft image container */}
              <div
                className="pointer-events-none select-none relative overflow-hidden aspect-video"
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

                {/* Red "Masb" watermark — paid items only */}
                {item.price_sar > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span
                      className="text-red-500 font-black text-base tracking-[0.3em] rotate-[-35deg] opacity-75 select-none pointer-events-none drop-shadow"
                      style={{ textShadow: "0 0 8px rgba(0,0,0,0.5)" }}
                    >
                      Masb
                    </span>
                  </div>
                )}

                {/* "Equipped" checkmark overlay */}
                {equipped && (
                  <div className="absolute top-1.5 start-1.5 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-1.5 end-1.5">
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
              </div>

              {/* Info + action */}
              <div className="p-2.5 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{item.name}</p>
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
    </div>
  );
};

export default MarketplaceTab;
