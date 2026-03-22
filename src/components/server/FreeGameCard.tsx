import React from "react";
import { ExternalLink, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FreeGameMetadata {
  title: string;
  thumbnail: string;
  description: string;
  instructions?: string;
  worth: string;
  end_date: string;
  open_giveaway_url: string;
  platforms: string;
}

function formatEndDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "While supplies last";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `Ends ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function PlatformBadge({ name }: { name: string }) {
  return (
    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
      {name.trim()}
    </span>
  );
}

interface Props {
  metadata: FreeGameMetadata;
  timestamp?: string;
}

const FreeGameCard = ({ metadata, timestamp }: Props) => {
  const platforms = metadata.platforms
    ? metadata.platforms.split(",").filter(Boolean)
    : [];

  return (
    <div className="max-w-[400px] rounded-lg overflow-hidden border border-border bg-card shadow-lg my-1">
      {/* Thumbnail */}
      {metadata.thumbnail && (
        <div className="relative">
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="w-full h-[180px] object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          {/* FREE badge overlay */}
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            FREE
          </div>
          {/* Was price */}
          {metadata.worth && metadata.worth !== "N/A" && metadata.worth !== "$0.00" && (
            <div className="absolute top-2 left-2 bg-black/60 text-white/70 text-[11px] px-2 py-0.5 rounded line-through">
              {metadata.worth}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-card-foreground leading-tight">{metadata.title}</p>
          <Gift className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
        </div>

        {/* Platforms */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.map((p) => <PlatformBadge key={p} name={p} />)}
          </div>
        )}

        {/* Description */}
        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
            {metadata.description}
          </p>
        )}

        {/* End date */}
        <p className="text-[11px] text-muted-foreground">{formatEndDate(metadata.end_date)}</p>

        {/* CTA */}
        <Button
          asChild
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs mt-1"
        >
          <a href={metadata.open_giveaway_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 me-1.5" />
            Claim for Free
          </a>
        </Button>
      </div>
    </div>
  );
};

export default FreeGameCard;
