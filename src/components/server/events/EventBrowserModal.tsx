import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Calendar, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import EventCard from "./EventCard";

interface EventBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  isAdmin: boolean;
  onCreateEvent: () => void;
}

interface EventWithMeta {
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
  creator: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  channel_name?: string | null;
  rsvp_count: number;
  is_interested: boolean;
}

const EventBrowserModal: React.FC<EventBrowserModalProps> = ({
  open,
  onOpenChange,
  serverId,
  isAdmin,
  onCreateEvent,
}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    const { data: rawEvents } = await supabase
      .from("server_events")
      .select("*")
      .eq("server_id", serverId)
      .in("status", ["scheduled", "active"])
      .order("start_time", { ascending: true });

    if (!rawEvents || rawEvents.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Fetch creator profiles
    const creatorIds = [...new Set(rawEvents.map((e) => e.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", creatorIds);

    const profileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
    profiles?.forEach((p) => { profileMap[p.user_id] = p; });

    const eventIds = rawEvents.map((e) => e.id);

    // Fetch RSVP counts
    const { data: rsvpCounts } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .in("event_id", eventIds);

    // Fetch user's RSVPs
    const { data: userRsvps } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("user_id", user.id)
      .in("event_id", eventIds);

    // Fetch channel names for voice events
    const voiceChannelIds = rawEvents
      .filter((e) => e.location_type === "voice" && e.channel_id)
      .map((e) => e.channel_id!);

    let channelMap: Record<string, string> = {};
    if (voiceChannelIds.length > 0) {
      const { data: channels } = await supabase
        .from("channels")
        .select("id, name")
        .in("id", voiceChannelIds);
      channels?.forEach((ch) => (channelMap[ch.id] = ch.name));
    }

    const countMap: Record<string, number> = {};
    rsvpCounts?.forEach((r) => {
      countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
    });

    const userRsvpSet = new Set(userRsvps?.map((r) => r.event_id));

    const mapped: EventWithMeta[] = rawEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start_time: e.start_time,
      end_time: e.end_time,
      location_type: e.location_type as string,
      channel_id: e.channel_id,
      external_location: e.external_location,
      cover_image_url: e.cover_image_url,
      status: e.status as string,
      creator: profileMap[e.creator_id] || null,
      channel_name: e.channel_id ? channelMap[e.channel_id] || null : null,
      rsvp_count: countMap[e.id] || 0,
      is_interested: userRsvpSet.has(e.id),
    }));

    setEvents(mapped);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchEvents();
  }, [open, serverId]);

  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`event-rsvps-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_rsvps" },
        () => fetchEvents()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, serverId]);

  const handleToggleRsvp = async (eventId: string, isInterested: boolean) => {
    if (!user) return;
    try {
      if (isInterested) {
        await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      } else {
        await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: user.id });
      }
      // Optimistic update
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                is_interested: !isInterested,
                rsvp_count: isInterested ? e.rsvp_count - 1 : e.rsvp_count + 1,
              }
            : e
        )
      );
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events
            </DialogTitle>
            {isAdmin && (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  onOpenChange(false);
                  onCreateEvent();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Event
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 -mx-6 px-6 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No upcoming events</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {isAdmin ? "Create one to get started!" : "Check back later for new events."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onToggleRsvp={handleToggleRsvp}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EventBrowserModal;
