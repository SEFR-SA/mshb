import React from "react";
import { Skull, FlaskConical, Star, Flame, Zap, Shield, LucideIcon } from "lucide-react";
import { OrbBadge } from "@/components/ui/badges/OrbBadge";
import { CrownBadge } from "@/components/ui/badges/CrownBadge";
import SwordBadge from "@/components/ui/badges/SwordBadge";

interface Props {
    badgeName?: string | null;
    color?: string;
    className?: string;
}

// Lucide icon placeholders — color applied via style.color (CSS currentColor inheritance)
const LUCIDE_BADGE_COMPONENTS: Record<string, LucideIcon> = {
    skull:  Skull,
    potion: FlaskConical,
    star:   Star,
    flame:  Flame,
    zap:    Zap,
    shield: Shield,
};

// Custom SVG badge components — color applied via the `color` prop
type CustomBadgeComponent = React.ComponentType<{ color?: string; className?: string }>;
const CUSTOM_BADGE_COMPONENTS: Record<string, CustomBadgeComponent> = {
    crown: CrownBadge,
    orb:   OrbBadge,
    sword: SwordBadge,
};

const ServerTagBadgeIcon = ({ badgeName, color, className = "h-3 w-3" }: Props) => {
    if (!badgeName) return null;

    const CustomComp = CUSTOM_BADGE_COMPONENTS[badgeName];
    if (CustomComp) {
        return <CustomComp color={color} className={className} />;
    }

    const Icon = LUCIDE_BADGE_COMPONENTS[badgeName];
    if (!Icon) return null;

    return <Icon className={className} style={{ color }} />;
};

export default ServerTagBadgeIcon;
