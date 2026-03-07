import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Heart, Gift, User, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ITEM_TYPE_GRADIENTS, type ItemType } from "@/config/marketplace";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ServerTagBadgeIcon from "@/components/ServerTagBadgeIcon";

export interface MarketplaceItem {
  id: string;
  title: string;
  type: ItemType;
  price_sar: number;
  thumbnail_url: string | null;
  asset_url: string | null;
}

interface MarketplaceCardProps {
  item: MarketplaceItem;
  isOwned: boolean;
  isEquipped: boolean;
  buying: boolean;
  equipping: boolean;
  onBuy: () => void;
  onEquip: () => void;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

const AvatarImg = ({ src, size }: { src?: string | null; size: number }) => (
  <Avatar className="shrink-0 bg-[#5865F2]" style={{ width: size, height: size }}>
    <AvatarImage src={src || ""} className="object-cover" />
    <AvatarFallback className="bg-[#5865F2] rounded-full">
      <User className="text-white/80" style={{ width: size * 0.5, height: size * 0.5 }} />
    </AvatarFallback>
  </Avatar>
);

const MarketplaceCard = ({
  item,
  isOwned,
  isEquipped,
  buying,
  equipping,
  onBuy,
  onEquip,
  userAvatarUrl,
  userName,
}: MarketplaceCardProps) => {
  const { t } = useTranslation();
  const displayName = userName || "";

  const renderPreview = () => {
    switch (item.type) {
      case "avatar_decoration":
        return (
          <>
            {/* Scattered sparkle decorations */}
            <span className="absolute top-4 left-6 text-yellow-300/60 text-xl">✦</span>
            <span className="absolute top-10 right-8 text-white/40 text-sm">✦</span>
            <span className="absolute bottom-12 left-10 text-yellow-200/50 text-xs">✦</span>
            <span className="absolute bottom-8 right-6 text-white/30 text-base">✦</span>
            <span className="absolute top-16 left-20 text-yellow-100/30 text-sm">✦</span>
            {/* Centered mock avatar with decoration overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AvatarDecorationWrapper decorationUrl={item.thumbnail_url} isPro={true} size={96}>
                <AvatarImg src={userAvatarUrl} size={96} />
              </AvatarDecorationWrapper>
            </div>
          </>
        );

      case "profile_effect":
        return (
          <>
            {/* Effect image overlay */}
            {item.thumbnail_url && (
              <img
                src={item.thumbnail_url}
                alt=""
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none z-[1]"
              />
            )}
            {/* Mock profile card bottom section */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-[2]">
              <div className="flex items-end gap-2.5">
                <AvatarImg src={userAvatarUrl} size={48} />
                <div className="pb-1 space-y-1.5">
                  <div className="h-2.5 w-24 bg-white/30 rounded-full" />
                  <div className="h-2 w-16 bg-white/15 rounded-full" />
                </div>
              </div>
            </div>
          </>
        );

      case "nameplate":
        return (
          <div className="absolute inset-0 flex flex-col justify-center gap-1 px-3">
            {/* Faded top row */}
            <div className="flex items-center gap-2 px-2 py-1.5 opacity-35">
              <div className="h-7 w-7 rounded-full bg-[#5865F2]/50 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-2 w-20 bg-white/30 rounded-full" />
                <div className="h-1.5 w-12 bg-white/20 rounded-full" />
              </div>
            </div>
            {/* Active middle row with nameplate background */}
            <NameplateWrapper nameplateUrl={item.thumbnail_url} isPro={true} className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-2">
                <AvatarImg src={userAvatarUrl} size={28} />
                <div className="space-y-1 flex-1">
                  <p className="text-[11px] font-bold text-white leading-none drop-shadow">{displayName}</p>
                  <div className="h-1.5 w-10 bg-white/40 rounded-full" />
                </div>
              </div>
            </NameplateWrapper>
            {/* Faded bottom row */}
            <div className="flex items-center gap-2 px-2 py-1.5 opacity-35">
              <div className="h-7 w-7 rounded-full bg-[#5865F2]/50 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-2 w-16 bg-white/30 rounded-full" />
                <div className="h-1.5 w-10 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        );

      case "tag":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/10">
              <AvatarImg src={userAvatarUrl} size={36} />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-bold">{displayName}</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none text-white whitespace-nowrap"
                    style={{ backgroundColor: "#5865F2" }}
                  >
                    <ServerTagBadgeIcon badgeName="crown" color="#ffffff" className="h-3.5 w-3.5" />
                    {item.title.slice(0, 4).toUpperCase()}
                  </span>
                </div>
                <div className="h-1.5 w-14 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        );

      case "bundle":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: 176, height: 112 }}>
              {(["avatar_decoration", "profile_effect", "nameplate"] as ItemType[]).map((type, i) => (
                <div
                  key={type}
                  className="absolute w-20 h-28 rounded-xl border border-white/20 shadow-xl"
                  style={{
                    background: ITEM_TYPE_GRADIENTS[type],
                    left: i * 52,
                    top: i === 1 ? 0 : 8,
                    transform: `rotate(${[-6, 0, 6][i]}deg)`,
                    zIndex: i + 1,
                  }}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-black/70 border border-white/[0.08] flex flex-col backdrop-blur-md">
      {/* Preview area */}
      <div
        className="h-56 relative overflow-hidden pointer-events-none select-none"
        style={{ background: ITEM_TYPE_GRADIENTS[item.type] }}
      >
        {/* Heart — pointer-events-auto escapes the parent's pointer-events-none */}
        <button className="absolute top-2 end-2 z-30 h-8 w-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center pointer-events-auto cursor-pointer hover:border-red-400/40 transition-colors group">
          <Heart className="h-3.5 w-3.5 text-white/40 group-hover:text-red-400 transition-colors" />
        </button>

        {renderPreview()}
      </div>

      {/* Details area */}
      <div className="px-3 pt-2.5 pb-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="text-sm font-bold text-white truncate">{item.title}</p>
          {isOwned && (
            <span className="text-[10px] text-green-400 font-semibold shrink-0">{t("marketplace.owned")}</span>
          )}
        </div>

        {isOwned ? (
          <Button
            size="sm"
            variant={isEquipped ? "secondary" : "outline"}
            className={cn(
              "w-full h-8 text-xs",
              isEquipped && "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
            )}
            onClick={onEquip}
            disabled={equipping || isEquipped}
          >
            {equipping ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isEquipped ? (
              <><Check className="h-3 w-3 me-1.5" />{t("marketplace.equipped")}</>
            ) : (
              t("marketplace.equip")
            )}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
              onClick={onBuy}
              disabled={buying}
            >
              {buying ? (
                <Loader2 className="h-3 w-3 animate-spin me-1.5" />
              ) : item.price_sar === 0 ? (
                t("marketplace.free")
              ) : (
                `${t("marketplace.buy")} ${item.price_sar.toFixed(2)} ${t("marketplace.sar")}`
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 shrink-0 border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
            >
              <Gift className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceCard;
