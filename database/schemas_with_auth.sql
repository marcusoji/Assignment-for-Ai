-- ============================================
-- SUPABASE DATABASE SCHEMA - WITH AUTHENTICATION
-- AI Tic-Tac-Toe Game
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (UPDATED WITH AUTH FIELDS)
-- Stores player information, authentication, and statistics
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Authentication fields
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(32) NOT NULL,
    
    -- Password reset fields
    reset_token VARCHAR(64),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    total_matches INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    matches_drawn INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT username_not_empty CHECK (LENGTH(TRIM(username)) > 0),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT stats_non_negative CHECK (
        total_matches >= 0 AND 
        matches_won >= 0 AND 
        matches_lost >= 0 AND 
        matches_drawn >= 0
    )
);

-- Indexes for fast lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- ============================================
-- MATCHES TABLE
-- Stores match information (Best-of-3)
-- ============================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Match configuration
    mode VARCHAR(20) NOT NULL,  -- 'human_vs_ai', 'human_vs_human', 'ai_vs_ai'
    difficulty VARCHAR(10),      -- 'easy', 'medium', 'hard' (NULL for non-AI modes)
    
    -- Match state
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',  -- 'in_progress', 'completed'
    current_round INTEGER DEFAULT 1,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Final result
    final_result VARCHAR(20),  -- 'player1_win', 'player2_win', 'draw'
    
    -- Constraints
    CONSTRAINT valid_mode CHECK (mode IN ('human_vs_ai', 'human_vs_human', 'ai_vs_ai')),
    CONSTRAINT valid_difficulty CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed')),
    CONSTRAINT valid_round CHECK (current_round BETWEEN 1 AND 3),
    CONSTRAINT valid_scores CHECK (player1_score >= 0 AND player2_score >= 0),
    CONSTRAINT valid_final_result CHECK (
        final_result IS NULL OR 
        final_result IN ('player1_win', 'player2_win', 'draw')
    ),
    CONSTRAINT max_best_of_3 CHECK (player1_score <= 2 AND player2_score <= 2)
);

-- Indexes for fast queries
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_user_completed ON matches(user_id, completed_at DESC) 
    WHERE status = 'completed';

-- ============================================
-- ROUNDS TABLE
-- Stores individual round data within matches
-- ============================================

CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Round information
    round_number INTEGER NOT NULL,
    winner VARCHAR(1),  -- 'X', 'O', or NULL for draw
    
    -- Board state (JSON array of 9 elements)
    board_state JSONB NOT NULL,
    
    -- Scores after this round
    player1_score INTEGER NOT NULL,
    player2_score INTEGER NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_round_number CHECK (round_number BETWEEN 1 AND 3),
    CONSTRAINT valid_winner CHECK (winner IS NULL OR winner IN ('X', 'O')),
    CONSTRAINT valid_board_state CHECK (jsonb_array_length(board_state) = 9),
    CONSTRAINT unique_round_per_match UNIQUE (match_id, round_number)
);

-- Index for fast round lookup
CREATE INDEX idx_rounds_match_id ON rounds(match_id);
CREATE INDEX idx_rounds_winner ON rounds(winner) WHERE winner IS NOT NULL;

-- ============================================
-- TRIGGERS
-- Automatic timestamp updates
-- ============================================

-- Update users.updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update last_login on user activity
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called from application code
    -- when user logs in
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS
-- Helper functions for statistics and auth
-- ============================================

-- Calculate user win rate
CREATE OR REPLACE FUNCTION calculate_win_rate(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total INTEGER;
    won INTEGER;
BEGIN
    SELECT total_matches, matches_won 
    INTO total, won
    FROM users 
    WHERE id = user_uuid;
    
    IF total = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((won::DECIMAL / total::DECIMAL) * 100, 1);
END;
$$ LANGUAGE plpgsql;

-- Clean expired reset tokens (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE users 
    SET reset_token = NULL, 
        reset_token_expires = NULL
    WHERE reset_token IS NOT NULL 
      AND reset_token_expires < NOW();
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- Useful views for analytics
-- ============================================

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.total_matches,
    u.matches_won,
    u.matches_lost,
    u.matches_drawn,
    CASE 
        WHEN u.total_matches = 0 THEN 0
        ELSE ROUND((u.matches_won::DECIMAL / u.total_matches::DECIMAL) * 100, 1)
    END as win_rate_percentage,
    u.created_at as member_since,
    u.last_login
FROM users u;

-- Match history view
CREATE OR REPLACE VIEW match_history AS
SELECT 
    m.id as match_id,
    m.user_id,
    u.username,
    u.email,
    m.mode,
    m.difficulty,
    m.final_result,
    m.player1_score,
    m.player2_score,
    m.created_at,
    m.completed_at,
    EXTRACT(EPOCH FROM (m.completed_at - m.created_at)) as duration_seconds
FROM matches m
JOIN users u ON m.user_id = u.id
WHERE m.status = 'completed';

-- Active users view (logged in within last 30 days)
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    username,
    email,
    total_matches,
    matches_won,
    last_login,
    DATE_PART('day', NOW() - last_login) as days_since_login
FROM users
WHERE last_login > NOW() - INTERVAL '30 days'
ORDER BY last_login DESC;

-- ============================================
-- SCHEDULED JOBS (CRON)
-- Setup in Supabase Dashboard → Database → Cron
-- ============================================

-- Clean expired reset tokens every hour
-- SELECT cron.schedule(
--     'clean-expired-tokens',
--     '0 * * * *',  -- Every hour
--     $$ SELECT clean_expired_reset_tokens(); $$
-- );

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Note: Password 'password123'
-- Don't use this in production!
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    password_salt,
    total_matches, 
    matches_won, 
    matches_lost, 
    matches_drawn
) VALUES (
    'Marcus',
    'marcuoji@gmail.com',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',  -- Replace with real hash
    'abc123def456',  -- Replace with real salt
    0, 0, 0, 0
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production with proper auth
-- ============================================

-- Enable RLS on all tables
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- Sample policies (uncomment and customize for production)
-- Note: These assume you're using Supabase Auth
-- If using custom auth, modify accordingly

-- Users can view their own data
-- CREATE POLICY "Users can view own data" 
--   ON users FOR SELECT 
--   USING (auth.uid() = id);

-- Users can update their own data (except auth fields)
-- CREATE POLICY "Users can update own data" 
--   ON users FOR UPDATE 
--   USING (auth.uid() = id);

-- Users can only access their own matches
-- CREATE POLICY "Users can view own matches"
--   ON matches FOR SELECT
--   USING (user_id = auth.uid());

-- CREATE POLICY "Users can create own matches"
--   ON matches FOR INSERT
--   WITH CHECK (user_id = auth.uid());

-- ============================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================

-- Query to check table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for slow queries
-- SELECT 
--     query,
--     calls,
--     total_time,
--     mean_time,
--     max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- ============================================
-- BACKUP RECOMMENDATIONS
-- ============================================

-- Supabase provides automatic daily backups
-- For critical data, consider:
-- 1. Manual backups before major changes
-- 2. Exporting user data periodically
-- 3. Testing restore procedures

-- Manual backup command (run locally):
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE users IS 'Stores player accounts, authentication, and statistics';
COMMENT ON TABLE matches IS 'Stores match data with Best-of-3 format';
COMMENT ON TABLE rounds IS 'Stores individual round data within matches';

COMMENT ON COLUMN users.password_hash IS 'PBKDF2-SHA256 hash of user password';
COMMENT ON COLUMN users.password_salt IS 'Random salt for password hashing';
COMMENT ON COLUMN users.reset_token IS 'Token for password reset (expires in 1 hour)';
COMMENT ON COLUMN matches.mode IS 'Game mode: human_vs_ai, human_vs_human, or ai_vs_ai';
COMMENT ON COLUMN matches.difficulty IS 'AI difficulty: easy, medium, or hard (only for human_vs_ai)';
COMMENT ON COLUMN rounds.board_state IS 'Final board state as JSON array of 9 elements';