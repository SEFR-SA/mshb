-- Profile notes: lets users keep private notes about other users
CREATE TABLE public.profile_notes (
  author_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (author_id, target_id)
);

ALTER TABLE public.profile_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON public.profile_notes
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
