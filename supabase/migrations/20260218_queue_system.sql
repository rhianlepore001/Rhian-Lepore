-- Virtual Queue System Migration

-- 1. Create queue_entries table
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, calling, serving, completed, cancelled, no_show
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_wait_time INTEGER, -- in minutes, optional manual override
    notes TEXT
);

-- 2. Enable RLS
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Public can insert (join queue)
CREATE POLICY "Public can join queue" ON queue_entries
    FOR INSERT
    WITH CHECK (true);

-- Public can view their own entry (conceptually, usually handled by return ID)
-- But effectively we want public to read queue *stats* not necessarily all rows.
-- However, for the status page, they need to read THEIR row.
-- We can allow public read for now or limit it. 
-- Let's allow public read for entries where status is NOT 'completed' OR 'cancelled' (active queue)
-- This allows the public board to work.
CREATE POLICY "Public can view active queue" ON queue_entries
    FOR SELECT
    USING (status NOT IN ('completed', 'cancelled', 'no_show'));

-- Business owners can manage their own queue
CREATE POLICY "Business owners manage their queue" ON queue_entries
    FOR ALL
    USING (auth.uid() = business_id);

-- 4. Indexes
CREATE INDEX idx_queue_business_status ON queue_entries(business_id, status);
CREATE INDEX idx_queue_joined_at ON queue_entries(joined_at);

-- 5. Functions

-- Function to get simple public queue status (anonymized for privacy if needed later, but fine for now)
-- Actually, Frontend can just query count of 'waiting' entries before a specific joined_at.

-- Function to join queue (wrapper to ensuring business rules if needed, but direct insert is fine for MVP)

-- Function to calculate position
CREATE OR REPLACE FUNCTION get_queue_position(p_queue_id UUID, p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_joined_at TIMESTAMPTZ;
    v_position INTEGER;
BEGIN
    SELECT joined_at INTO v_joined_at FROM queue_entries WHERE id = p_queue_id;
    
    SELECT COUNT(*) + 1 INTO v_position
    FROM queue_entries
    WHERE business_id = p_business_id 
      AND status = 'waiting'
      AND joined_at < v_joined_at;
      
    RETURN v_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
