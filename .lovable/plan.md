

## Server Events System — Implementation Plan

### Overview
Build a Discord-style server events system: database tables, storage bucket, creation wizard, sidebar indicator, and event browser with RSVP — across 4 phases.

### Phase 1: Database & Storage Migration

**Migration file** via migration tool:

```sql
-- Enums
CREATE TYPE public.event_location_type AS ENUM ('voice', 'external');
CREATE TYPE public.event_status AS ENUM ('scheduled', 'active', 'completed', 'canceled');

-- server_events table
CREATE TABLE public.server_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location_type event_location_type NOT NULL DEFAULT 'voice',
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  external_location text,
  cover_image_url text,
  status event_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_rsvps table
CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.server_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- RLS
ALTER TABLE public.server_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- View: server members can see events
CREATE POLICY "Members can view events" ON public.server_events
  FOR SELECT TO authenticated
  USING (is_server_member(auth.uid(), server_id));

-- Insert/Update/Delete: admins only
CREATE POLICY "Admins can manage events" ON public.server_events
  FOR ALL TO authenticated
  USING (is_server_admin(auth.uid(), server_id))
  WITH CHECK (is_server_admin(auth.uid(), server_id));

-- RSVPs: members can view
CREATE POLICY "Members can view rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.server_events e
    WHERE e.id = event_id AND is_server_member(auth.uid(), e.server_id)
  ));

-- RSVPs: users manage their own
CREATE POLICY "Users manage own rsvps" ON public.event_rsvps
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own rsvps" ON public.event_rsvps
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvps;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event_covers', 'event_covers', true);

-- Storage policies
CREATE POLICY "Anyone can view event covers" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'event_covers');

CREATE POLICY "Authenticated users can upload event covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event_covers');

CREATE POLICY "Users can delete own event covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'event_covers');
```

### Phase 2: Creation Modal — `src/components/server/events/CreateEventModal.tsx`

**State management**: A single `useState` object holds all form fields. A `step` state (1–3) controls the wizard.

```text
FormState = {
  locationType: 'voice' | 'external'
  channelId: string | null
  externalLocation: string
  title: string
  description: string
  startDate: Date
  startTime: string
  frequency: 'none' | 'weekly' | 'daily'  // future-proof but only 'none' for now
  coverFile: File | null
  coverPreview: string | null
}
```

**Step 1 — Location**: Radio group (Voice Channel / Somewhere Else). If voice, show a `<Select>` of voice channels. If external, show a text input.

**Step 2 — Event Info**: Title, date picker, time select, description textarea, cover image upload with preview and "Remove Image" button.

**Step 3 — Review**: Render a preview card matching the Discord review screenshot. "Back", "Cancel", "Create Event" buttons. On submit: upload cover to `event_covers` bucket, insert into `server_events`.

**Trigger**: Add a "Create Event" option to the server header dropdown in `ChannelSidebar.tsx` (visible to admins only). Opens the modal.

### Phase 3: Sidebar Indicator — `src/components/server/events/EventSidebarIndicator.tsx`

- Fetches count of `server_events` where `server_id = current` and `status IN ('scheduled', 'active')`.
- Subscribes to realtime `postgres_changes` on `server_events` filtered by `server_id`.
- Renders a small bar: calendar icon + "X Event(s)" text, clickable.
- Placed in `ChannelSidebar.tsx` between the server header and the channel list (line ~978, before the `flex-1 overflow-y-auto` div content).
- Only renders if count > 0.

### Phase 4: Event Browser & RSVP — `src/components/server/events/EventBrowserModal.tsx`

- Opens when clicking the sidebar indicator.
- Header: calendar icon + "X Event(s)" + "Create Event" button (admin only).
- Fetches all upcoming events with RSVP counts via a joined query.
- **EventCard** component per event: cover image, title, time, location, description snippet, creator avatar/name, interested count.
- **RSVP logic**: Check if current user has an `event_rsvps` row. Toggle insert/delete on click. Realtime subscription on `event_rsvps` filtered by event IDs updates counts live.
- **Event detail view**: Clicking a card expands to full detail with tabs: "Event Info" and "X Interested" (list of users).
- **Context menu** (admin): Edit Event, Cancel Event, Copy Event Link.

### Files to create
- `src/components/server/events/CreateEventModal.tsx`
- `src/components/server/events/EventSidebarIndicator.tsx`
- `src/components/server/events/EventBrowserModal.tsx`
- `src/components/server/events/EventCard.tsx`

### Files to modify
- `src/components/server/ChannelSidebar.tsx` — Add EventSidebarIndicator + "Create Event" menu item
- New migration via migration tool

### Realtime strategy
- `EventSidebarIndicator`: subscribes to `server_events` changes (INSERT/UPDATE/DELETE) filtered by `server_id` → refetches count.
- `EventBrowserModal`: subscribes to `event_rsvps` changes → refetches RSVP counts for displayed events.
- No separate subscription needed for the creation modal — it closes after submit and the indicator auto-updates.

