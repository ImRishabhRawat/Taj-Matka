-- =============================================
-- ADDITIONAL TABLES FOR ADMIN PANEL
-- =============================================

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
    target_user_ids INTEGER[],
    sent_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- =============================================
-- POPUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS popups (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_audience VARCHAR(20) DEFAULT 'all' CHECK (target_audience IN ('all', 'new', 'active')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_popups_active ON popups(is_active);
CREATE INDEX idx_popups_dates ON popups(start_date, end_date);

-- =============================================
-- UPDATE TRANSACTIONS TABLE
-- Add payment_method and transaction_id columns if they don't exist
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='payment_method') THEN
        ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(20) CHECK (payment_method IN ('upi', 'bank'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='transaction_id') THEN
        ALTER TABLE transactions ADD COLUMN transaction_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='type') THEN
        ALTER TABLE transactions ADD COLUMN type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal'));
    END IF;
END $$;

-- =============================================
-- UPDATE WITHDRAWAL_REQUESTS TABLE
-- Add payment_method and upi_id columns if they don't exist
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='withdrawal_requests' AND column_name='payment_method') THEN
        ALTER TABLE withdrawal_requests ADD COLUMN payment_method VARCHAR(20) DEFAULT 'bank' CHECK (payment_method IN ('upi', 'bank'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='withdrawal_requests' AND column_name='upi_id') THEN
        ALTER TABLE withdrawal_requests ADD COLUMN upi_id VARCHAR(100);
    END IF;
END $$;

-- =============================================
-- UPDATE GAME_SESSIONS TABLE
-- Add session_type column for open/close sessions
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='game_sessions' AND column_name='session_type') THEN
        ALTER TABLE game_sessions ADD COLUMN session_type VARCHAR(10) DEFAULT 'open' CHECK (session_type IN ('open', 'close'));
        -- Update the unique constraint to include session_type
        ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_game_id_session_date_key;
        ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_game_id_session_date_type_key 
            UNIQUE(game_id, session_date, session_type);
    END IF;
END $$;

-- =============================================
-- TRIGGERS FOR NEW TABLES
-- =============================================
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_popups_updated_at 
    BEFORE UPDATE ON popups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
