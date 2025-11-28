-- 001_init.sql: Initial schema setup
-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  impostor_count INTEGER DEFAULT 1,
  current_word TEXT,
  impostors JSONB,
  round_number INTEGER DEFAULT 0,
  first_player_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create round_history table for statistics
CREATE TABLE IF NOT EXISTS round_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  impostor_ids JSONB NOT NULL,
  first_player_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for tables (idempotent - will skip if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;
END $$;

-- Enable row level security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_history ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (idempotent using IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on sessions' AND tablename = 'sessions'
  ) THEN
    CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on players' AND tablename = 'players'
  ) THEN
    CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on round_history' AND tablename = 'round_history'
  ) THEN
    CREATE POLICY "Allow all operations on round_history" ON round_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
