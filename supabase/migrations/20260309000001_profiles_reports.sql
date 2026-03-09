-- ============================================================
-- profiles_reports — user-to-user profile report submissions
-- ============================================================

CREATE TABLE public.profiles_reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_elements text[]      NOT NULL DEFAULT '{}',
  main_reason       text        NOT NULL,
  sub_reason        text,
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_reports_reporter_idx ON public.profiles_reports (reporter_id);
CREATE INDEX profiles_reports_reported_idx ON public.profiles_reports (reported_id);
CREATE INDEX profiles_reports_status_idx   ON public.profiles_reports (status);

ALTER TABLE public.profiles_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "users can report"
  ON public.profiles_reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Users can view reports they submitted
CREATE POLICY "users can view own reports"
  ON public.profiles_reports
  FOR SELECT
  USING (reporter_id = auth.uid());
