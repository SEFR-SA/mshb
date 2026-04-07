import React, { useEffect, useState } from "react";
import { Calendar, MapPin, Volume2, Users, Star, MoreHorizontal, Play, Flag, Pencil, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location_type: string;
    channel_id: string | null;
    external_location: string | null;
    cover_image_url: string | null;
    status: string;
    creator_id: string;
    creator: {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
    channel_name?: string | null;
    rsvp_count: number;
    is_interested: boolean;
  };
  isAdmin: boolean;
  currentUserId: string | null;
  onToggleRsvp: (eventId: string, isInterested: boolean) => void;
  onStartEvent?: (eventId: string) => void;
  onEditEvent?: (eventId: string) => void;
  onCancelEvent?: (eventId: string) => void;
  onClick?: () => void;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const EventCard: React.FC<EventCardProps> = ({
  event,
  isAdmin,
  currentUserId,
  onToggleRsvp,
  onStartEvent,
  onEditEvent,
  onCancelEvent,
  onClick,
}) => {
  const [tick, setTick] = useState(0);

  // Re-evaluate every 60s for the time-gated start button
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const startDate = new Date(event.start_time);
  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationText =
    event.location_type === "voice"
      ? event.channel_name || "Voice Channel"
      : event.external_location || "External Location";

  const creatorName = event.creator?.display_name || event.creator?.username || "Unknown";

  const isCreatorOrAdmin = currentUserId === event.creator_id || isAdmin;
  const timeUntilStart = startDate.getTime() - Date.now();
  const canStart =
    isCreatorOrAdmin &&
    event.status === "scheduled" &&
    timeUntilStart <= FIFTEEN_MINUTES;

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {event.cover_image_url && (
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-primary uppercase">
          {formattedDate} — {formattedTime}
        </p>
        <h3 className="text-base font-bold text-foreground">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {event.location_type === "voice" ? (
            <Volume2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{locationText}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={event.creator?.avatar_url || ""} />
              <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{creatorName}</span>
          </div>

          <div className="flex items-center gap-2">
            {event.rsvp_count > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.rsvp_count}
              </span>
            )}
            <Button
              size="sm"
              variant={event.is_interested ? "secondary" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRsvp(event.id, event.is_interested);
              }}
            >
              <Star className={`h-3 w-3 ${event.is_interested ? "fill-current" : ""}`} />
              Interested
            </Button>

            {canStart && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEvent?.(event.id);
                }}
              >
                <Play className="h-3 w-3" />
                Start
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {isCreatorOrAdmin && event.status === "scheduled" && (
                  <DropdownMenuItem onClick={() => onStartEvent?.(event.id)}>
                    <Play className="h-4 w-4 me-2" />
                    Start Event
                  </DropdownMenuItem>
                )}
                {isCreatorOrAdmin && (
                  <DropdownMenuItem onClick={() => onEditEvent?.(event.id)}>
                    <Pencil className="h-4 w-4 me-2" />
                    Edit Event
                  </DropdownMenuItem>
                )}
                {isCreatorOrAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onCancelEvent?.(event.id)}
                    >
                      <XCircle className="h-4 w-4 me-2" />
                      Cancel Event
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Flag className="h-4 w-4 me-2" />
                  Report Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
