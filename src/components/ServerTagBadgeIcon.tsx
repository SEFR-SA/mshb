import React from "react";
import { Star, Flame, Zap, Shield, Crown, Award, Gem, Rocket, Music, Heart, LucideIcon } from "lucide-react";

interface Props {
    badgeName?: string | null;
    className?: string;
}

const BADGE_MAP: Record<string, LucideIcon> = {
    Star,
    Flame,
    Zap,
    Shield,
    Crown,
    Award,
    Gem,
    Rocket,
    Music,
    Heart,
};

const ServerTagBadgeIcon = ({ badgeName, className = "h-3 w-3" }: Props) => {
    if (!badgeName) return null;

    if (badgeName.startsWith("http")) {
        return (
            <img
                src={badgeName}
                alt="tag badge"
                className={className}
                style={{ objectFit: "contain" }}
            />
        );
    }

    const Icon = BADGE_MAP[badgeName];
    if (!Icon) return null;

    return <Icon className={className} />;
};

export default ServerTagBadgeIcon;
