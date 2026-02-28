-- ============================================================
-- Marketplace: catalog, purchase records, and equipped items
-- ============================================================

-- Public item catalog (future use — UI items are currently hardcoded)
CREATE TABLE public.marketplace_items (
  id            uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text          NOT NULL,
  category      text          NOT NULL CHECK (category IN ('banner','avatar','soundboard','sticker','emoji','tag')),
  type          text          NOT NULL CHECK (type IN ('static','gif','free')),
  price_sar     numeric(10,2) NOT NULL DEFAULT 0,
  thumbnail_url text          NOT NULL,
  asset_url     text          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_items_public_select"
  ON public.marketplace_items FOR SELECT USING (true);

-- ============================================================

-- Purchase records
-- item_id is TEXT (not UUID FK) so hardcoded component IDs work
-- without requiring rows in marketplace_items
CREATE TABLE public.user_purchases (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id        text        NOT NULL,
  purchased_at   timestamptz NOT NULL DEFAULT now(),
  transaction_id text,
  UNIQUE (user_id, item_id)
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_purchases_own_select"
  ON public.user_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_purchases_own_insert"
  ON public.user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================

-- Equipped item per category (one active item per category per user)
CREATE TABLE public.user_equipped (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text        NOT NULL,
  item_id     text        NOT NULL,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

ALTER TABLE public.user_equipped ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_equipped_own_select"
  ON public.user_equipped FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_equipped_own_insert"
  ON public.user_equipped FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_equipped_own_update"
  ON public.user_equipped FOR UPDATE USING (auth.uid() = user_id);
