import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  creator_id: string;
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
  const { setVoiceChannel } = useVoiceChannel();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ type: "start" | "cancel"; eventId: string } | null>(null);

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

    const creatorIds = [...new Set(rawEvents.map((e) => e.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", creatorIds);

    const profileMap: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
    profiles?.forEach((p) => { profileMap[p.user_id] = p; });

    const eventIds = rawEvents.map((e) => e.id);

    const { data: rsvpCounts } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .in("event_id", eventIds);

    const { data: userRsvps } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("user_id", user.id)
      .in("event_id", eventIds);

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
      creator_id: e.creator_id,
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
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, is_interested: !isInterested, rsvp_count: isInterested ? e.rsvp_count - 1 : e.rsvp_count + 1 }
            : e
        )
      );
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !user) return;
    const { type, eventId } = confirmAction;
    const event = events.find((e) => e.id === eventId);

    if (type === "start") {
      const { error } = await supabase
        .from("server_events")
        .update({ status: "active" as any })
        .eq("id", eventId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Event started!" });
        setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "active" } : e));
        onOpenChange(false);

        // Auto-join voice channel if applicable
        if (event?.location_type === "voice" && event.channel_id) {
          const channelName = event.channel_name || "Voice Channel";
          setVoiceChannel({ id: event.channel_id, name: channelName, serverId });
          navigate(`/server/${serverId}/channel/${event.channel_id}`);
        }
      }
    } else if (type === "cancel") {
      const { error } = await supabase
        .from("server_events")
        .update({ status: "cancelled" as any })
        .eq("id", eventId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Event cancelled" });
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    }

    setConfirmAction(null);
  };

  const confirmEvent = confirmAction ? events.find((e) => e.id === confirmAction.eventId) : null;

  return (
    <>
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
                    isAdmin={isAdmin}
                    currentUserId={user?.id || null}
                    onToggleRsvp={handleToggleRsvp}
                    onStartEvent={(id) => setConfirmAction({ type: "start", eventId: id })}
                    onCancelEvent={(id) => setConfirmAction({ type: "cancel", eventId: id })}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "start" ? "Start Event" : "Cancel Event"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "start"
                ? `Are you sure you want to start "${confirmEvent?.title}"? This will mark the event as active.`
                : `Are you sure you want to cancel "${confirmEvent?.title}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction?.type === "cancel" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmAction?.type === "start" ? "Start Event" : "Cancel Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EventBrowserModal;
