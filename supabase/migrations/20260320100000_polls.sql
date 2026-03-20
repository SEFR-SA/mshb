-- ─── Polls Feature ─────────────────────────────────────────────────────────
-- Relational tables for Discord-style polls in server channels.

-- polls: 1:1 with a message (type='poll')
CREATE TABLE public.polls (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id   UUID        NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  question     TEXT        NOT NULL,
  allow_multiple BOOLEAN   DEFAULT false NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- poll_answers: the selectable choices
CREATE TABLE public.poll_answers (
  id       UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id  UUID     NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text     TEXT     NOT NULL,
  emoji    TEXT,
  position SMALLINT NOT NULL DEFAULT 0
);

-- poll_votes: one row per user per answer (UNIQUE enforces no duplicate per answer)
CREATE TABLE public.poll_votes (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id   UUID        NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  answer_id UUID        NOT NULL REFERENCES public.poll_answers(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(poll_id, answer_id, user_id)
);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.polls       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes  ENABLE ROW LEVEL SECURITY;

-- polls: any server member of the channel can read
CREATE POLICY "Server members can view polls" ON public.polls FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
    WHERE m.id = polls.message_id
      AND public.is_server_member(auth.uid(), c.server_id)
  ));

-- polls: only the message author can create a poll row
CREATE POLICY "Message author can create poll" ON public.polls FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND m.author_id = auth.uid()
  ));

-- poll_answers: readable by channel's server members
CREATE POLICY "Server members can view answers" ON public.poll_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    JOIN public.messages m ON m.id = p.message_id
    JOIN public.channels c ON c.id = m.channel_id
    WHERE p.id = poll_answers.poll_id
      AND public.is_server_member(auth.uid(), c.server_id)
  ));

-- poll_answers: only poll creator can insert answers
CREATE POLICY "Poll creator can add answers" ON public.poll_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.polls p
    JOIN public.messages m ON m.id = p.message_id
    WHERE p.id = poll_id AND m.author_id = auth.uid()
  ));

-- poll_votes: readable by channel's server members
CREATE POLICY "Server members can view votes" ON public.poll_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.polls p
    JOIN public.messages m ON m.id = p.message_id
    JOIN public.channels c ON c.id = m.channel_id
    WHERE p.id = poll_votes.poll_id
      AND public.is_server_member(auth.uid(), c.server_id)
  ));

-- poll_votes: server members can vote as themselves
CREATE POLICY "Members can vote" ON public.poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.messages m ON m.id = p.message_id
      JOIN public.channels c ON c.id = m.channel_id
      WHERE p.id = poll_id
        AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

-- poll_votes: users can only delete their own votes
CREATE POLICY "Users can remove own votes" ON public.poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RPC Functions ───────────────────────────────────────────────────────────

-- cast_poll_vote: atomically handles single-choice (clears prior votes) + duplicate guard
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id uuid, p_answer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_multiple boolean;
  v_expires_at     timestamptz;
BEGIN
  SELECT allow_multiple, expires_at
  INTO   v_allow_multiple, v_expires_at
  FROM   public.polls
  WHERE  id = p_poll_id;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'poll_expired';
  END IF;

  IF NOT v_allow_multiple THEN
    DELETE FROM public.poll_votes
    WHERE  poll_id = p_poll_id AND user_id = auth.uid();
  END IF;

  INSERT INTO public.poll_votes (poll_id, answer_id, user_id)
  VALUES (p_poll_id, p_answer_id, auth.uid())
  ON CONFLICT (poll_id, answer_id, user_id) DO NOTHING;
END;
$$;

-- remove_poll_votes: remove all of the calling user's votes for a poll
CREATE OR REPLACE FUNCTION public.remove_poll_votes(p_poll_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.poll_votes
  WHERE poll_id = p_poll_id AND user_id = auth.uid();
END;
$$;

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime updates so PollView components refresh live when votes change.
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
