import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreatorStudio from "./CreatorStudio";
import MarketplaceCard, { type MarketplaceItem } from "@/components/marketplace/MarketplaceCard";
import { ITEM_TYPES, ITEM_TYPE_LABELS, type ItemType } from "@/config/marketplace";

type FilterType = "all" | ItemType;

const TYPE_FILTERS: { id: FilterType; labelKey: string }[] = [
  { id: "all",               labelKey: "marketplace.all" },
  { id: "avatar_decoration", labelKey: "marketplace.avatarDecorations" },
  { id: "profile_effect",    labelKey: "marketplace.profileEffects" },
  { id: "nameplate",         labelKey: "marketplace.nameplates" },
  { id: "tag",               labelKey: "marketplace.tags" },
  { id: "bundle",            labelKey: "marketplace.bundles" },
];

// URLs sourced from existing src/lib/decorations.ts, nameplates.ts, profileEffects.ts
const MOCK_ITEMS: MarketplaceItem[] = [
  // ── Avatar Decorations ────────────────────────────────────────────
  { id: "deco_1", title: "Glitch Effect",    type: "avatar_decoration", price_sar: 19.99,
    thumbnail_url: "https://cdn.discordapp.com/avatar-decoration-presets/a_e90ebc0114e7bdc30353c8b11953ea41.png?size=96&passthrough=true",
    asset_url:     "https://cdn.discordapp.com/avatar-decoration-presets/a_e90ebc0114e7bdc30353c8b11953ea41.png?size=96&passthrough=true" },
  { id: "deco_2", title: "Golden Crown",     type: "avatar_decoration", price_sar: 24.99,
    thumbnail_url: "https://cdn.discordapp.com/avatar-decoration-presets/a_65db91cee351e36150a2b506b26eba71.png?size=96&passthrough=true",
    asset_url:     "https://cdn.discordapp.com/avatar-decoration-presets/a_65db91cee351e36150a2b506b26eba71.png?size=96&passthrough=true" },
  { id: "deco_3", title: "Floating Hearts",  type: "avatar_decoration", price_sar: 0,
    thumbnail_url: "https://cdn.discordapp.com/avatar-decoration-presets/a_3e1fc3c7ee2e34e8176f4737427e8f4f.png?size=96&passthrough=true",
    asset_url:     "https://cdn.discordapp.com/avatar-decoration-presets/a_3e1fc3c7ee2e34e8176f4737427e8f4f.png?size=96&passthrough=true" },
  { id: "deco_4", title: "Sakura Blossoms",  type: "avatar_decoration", price_sar: 19.99,
    thumbnail_url: "https://cdn.discordapp.com/avatar-decoration-presets/a_13913a00bd9990ab4102a3bf069f0f3f.png?size=96&passthrough=true",
    asset_url:     "https://cdn.discordapp.com/avatar-decoration-presets/a_13913a00bd9990ab4102a3bf069f0f3f.png?size=96&passthrough=true" },
  // ── Profile Effects ───────────────────────────────────────────────
  { id: "effect_1", title: "Floating Hearts", type: "profile_effect",   price_sar: 29.99,
    thumbnail_url: "https://placehold.co/440x580/transparent/ff69b4?text=Hearts",
    asset_url:     "https://placehold.co/440x580/transparent/ff69b4?text=Hearts" },
  { id: "effect_2", title: "Sparkle Burst",   type: "profile_effect",   price_sar: 29.99,
    thumbnail_url: "https://placehold.co/440x580/transparent/ffd700?text=Sparkle",
    asset_url:     "https://placehold.co/440x580/transparent/ffd700?text=Sparkle" },
  { id: "effect_3", title: "Flame Aura",       type: "profile_effect",   price_sar: 0,
    thumbnail_url: "https://placehold.co/440x580/transparent/ff4500?text=Flame",
    asset_url:     "https://placehold.co/440x580/transparent/ff4500?text=Flame" },
  // ── Nameplates ────────────────────────────────────────────────────
  { id: "np_1", title: "Midnight Gradient",  type: "nameplate",         price_sar: 14.99,
    thumbnail_url: "https://placehold.co/600x80/1a1a2e/e94560?text=Midnight",
    asset_url:     "https://placehold.co/600x80/1a1a2e/e94560?text=Midnight" },
  { id: "np_2", title: "Ocean Breeze",       type: "nameplate",         price_sar: 0,
    thumbnail_url: "https://placehold.co/600x80/0f3460/16a085?text=Ocean",
    asset_url:     "https://placehold.co/600x80/0f3460/16a085?text=Ocean" },
  { id: "np_3", title: "Sunset Glow",        type: "nameplate",         price_sar: 14.99,
    thumbnail_url: "https://placehold.co/600x80/ff6b35/f7931e?text=Sunset",
    asset_url:     "https://placehold.co/600x80/ff6b35/f7931e?text=Sunset" },
  // ── Tags ──────────────────────────────────────────────────────────
  { id: "tag_1", title: "Gold Crown",        type: "tag",               price_sar: 14.99, thumbnail_url: null, asset_url: null },
  { id: "tag_2", title: "Verified",          type: "tag",               price_sar: 0,     thumbnail_url: null, asset_url: null },
  { id: "tag_3", title: "MVP",               type: "tag",               price_sar: 9.99,  thumbnail_url: null, asset_url: null },
  // ── Bundles ───────────────────────────────────────────────────────
  { id: "bundle_1", title: "Starter Pack",  type: "bundle",             price_sar: 49.99, thumbnail_url: null, asset_url: null },
  { id: "bundle_2", title: "Creator Kit",   type: "bundle",             price_sar: 79.99, thumbnail_url: null, asset_url: null },
];

const profileCols: Partial<Record<ItemType, string>> = {
  avatar_decoration: "avatar_decoration_url",
  nameplate:         "nameplate_url",
  profile_effect:    "profile_effect_url",
};

const MarketplaceTab = () => {
  const { t } = useTranslation();
  const { user, profile, purchasedItemIds, equippedItems, refreshPurchases, refreshProfile } = useAuth();
  const [view, setView]           = useState<"storefront" | "creator">("storefront");
  const [activeType, setActiveType] = useState<FilterType>("all");
  const [search, setSearch]       = useState("");
  const [buying, setBuying]       = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const handleCreatorTabClick = () => {
    if (!profile?.is_pro) {
      toast({ title: t("pro.upgradeToast") });
      return;
    }
    setView("creator");
  };

  const filteredItems = MOCK_ITEMS
    .filter((item) => activeType === "all" || item.type === activeType)
    .filter((item) => !search || item.title.toLowerCase().includes(search.toLowerCase()));

  const isOwned    = (item: MarketplaceItem) => item.price_sar === 0 || purchasedItemIds.includes(item.id);
  const isEquipped = (item: MarketplaceItem) => equippedItems[item.type] === item.id;

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
      category: item.type,
      item_id: item.id,
      equipped_at: new Date().toISOString(),
    });
    const col = profileCols[item.type];
    if (col) {
      await supabase.from("profiles").update({ [col]: item.asset_url } as any).eq("user_id", user.id);
      await refreshProfile();
    }
    setEquipping(null);
    toast({ title: t("marketplace.equipSuccess") });
    refreshPurchases();
  };

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

      {view === "creator" ? <CreatorStudio /> : (
        <>
          {/* ── Sticky search + type filter ──────────────────────────── */}
          <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 bg-background/90 backdrop-blur-sm pb-3 space-y-2 pt-1">
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
            <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {TYPE_FILTERS.map(({ id, labelKey }) => (
                <button
                  key={id}
                  onClick={() => setActiveType(id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0",
                    activeType === id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Item grid ─────────────────────────────────────────────── */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <MarketplaceCard
                  key={item.id}
                  item={item}
                  isOwned={isOwned(item)}
                  isEquipped={isEquipped(item)}
                  buying={buying === item.id}
                  equipping={equipping === item.id}
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{t("marketplace.noResults")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarketplaceTab;
