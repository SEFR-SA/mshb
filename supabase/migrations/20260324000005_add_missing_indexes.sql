-- messages: the single most critical table — zero indexes currently.
-- Partial indexes (WHERE col IS NOT NULL) skip rows where the column is unused,
-- keeping storage lean and write overhead minimal.
CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at
  ON public.messages (thread_id, created_at DESC)
  WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_group_thread_id_created_at
  ON public.messages (group_thread_id, created_at DESC)
  WHERE group_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_channel_id_created_at
  ON public.messages (channel_id, created_at DESC)
  WHERE channel_id IS NOT NULL;

-- channels: server + type filter used by useServerUnread on every load
CREATE INDEX IF NOT EXISTS idx_channels_server_id_type
  ON public.channels (server_id, type);

-- server_members: listing all members of a server (server_id-first lookup)
-- The existing composite (user_id, server_id) does not help queries that
-- only filter by server_id.
CREATE INDEX IF NOT EXISTS idx_server_members_server_id
  ON public.server_members (server_id);

-- friendships: status-filtered lookups from both sides of the relationship
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id_status
  ON public.friendships (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id_status
  ON public.friendships (addressee_id, status);

-- voice_channel_participants: IN(channel_id) queries for the active voice list
CREATE INDEX IF NOT EXISTS idx_voice_participants_channel_id
  ON public.voice_channel_participants (channel_id);
