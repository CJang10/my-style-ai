-- ============================================================
-- Phase 1: Social Layer Schema
-- ============================================================

-- ── profiles additions ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- ── closet_items additions ───────────────────────────────────
ALTER TABLE closet_items
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_to_trade BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_to_borrow BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_value INTEGER; -- in cents

-- ── follows ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- ── trade_requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_item_id UUID NOT NULL REFERENCES closet_items(id) ON DELETE CASCADE,
  offered_item_id UUID REFERENCES closet_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('trade', 'borrow')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  message TEXT,
  meet_or_ship TEXT CHECK (meet_or_ship IN ('meetup', 'ship')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_request_id UUID NOT NULL REFERENCES trade_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── updated_at trigger for trade_requests ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trade_requests_updated_at ON trade_requests;
CREATE TRIGGER trade_requests_updated_at
  BEFORE UPDATE ON trade_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

-- profiles: own row OR public
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- closet_items: own row OR publicly visible item
DROP POLICY IF EXISTS "closet_items_select" ON closet_items;
CREATE POLICY "closet_items_select" ON closet_items
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- follows: anyone can read; users manage their own follower rows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON follows;
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert" ON follows;
CREATE POLICY "follows_insert" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete" ON follows;
CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- trade_requests: participants only
ALTER TABLE trade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_requests_select" ON trade_requests;
CREATE POLICY "trade_requests_select" ON trade_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "trade_requests_insert" ON trade_requests;
CREATE POLICY "trade_requests_insert" ON trade_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "trade_requests_update" ON trade_requests;
CREATE POLICY "trade_requests_update" ON trade_requests
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = owner_id);

-- messages: participants of the parent trade_request only
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trade_requests tr
      WHERE tr.id = messages.trade_request_id
        AND (tr.requester_id = auth.uid() OR tr.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM trade_requests tr
      WHERE tr.id = messages.trade_request_id
        AND (tr.requester_id = auth.uid() OR tr.owner_id = auth.uid())
    )
  );
