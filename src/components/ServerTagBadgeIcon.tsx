import React from "react";
import CactusBadge from "@/components/ui/badges/CactusBadge";
import CrystalBadge from "@/components/ui/badges/CrystalBadge";
import HeartBadge from "@/components/ui/badges/HeartBadge";
import FlameBadge from "@/components/ui/badges/FlameBadge";
import DropBadge from "@/components/ui/badges/DropBadge";
import RobotBadge from "@/components/ui/badges/RobotBadge";
import SpiritBadge from "@/components/ui/badges/SpiritBadge";
import StarBadge from "@/components/ui/badges/StarBadge";
import CompassBadge from "@/components/ui/badges/CompassBadge";
import BannerBadge from "@/components/ui/badges/BannerBadge";

interface Props {
    badgeName?: string | null;
    color?: string;
    className?: string;
}

// Custom SVG badge components — color prop accepted for API compatibility
type CustomBadgeComponent = React.ComponentType<{ color?: string; className?: string }>;
const CUSTOM_BADGE_COMPONENTS: Record<string, CustomBadgeComponent> = {
    cactus:  CactusBadge,
    crystal: CrystalBadge,
    heart:   HeartBadge,
    flame:   FlameBadge,
    drop:    DropBadge,
    robot:   RobotBadge,
    spirit:  SpiritBadge,
    star:    StarBadge,
    compass: CompassBadge,
    banner:  BannerBadge,
};

const ServerTagBadgeIcon = ({ badgeName, color, className = "h-4 w-4" }: Props) => {
    if (!badgeName) return null;

    const CustomComp = CUSTOM_BADGE_COMPONENTS[badgeName];
    if (!CustomComp) return null;

    return <CustomComp color={color} className={className} />;
};

export default ServerTagBadgeIcon;
