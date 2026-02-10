-- =============================================
-- TAJ MATKA DATABASE SCHEMA
-- =============================================

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    winning_balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (winning_balance >= 0),
    held_withdrawal_balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (held_withdrawal_balance >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- GAMES TABLE
-- =============================================
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    mid_time TIME,
    max_bet_after_mid_time DECIMAL(10, 2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_games_active ON games(is_active);

-- =============================================
-- GAME SESSIONS TABLE (Daily Instances)
-- =============================================
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    winning_number VARCHAR(2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    result_declared_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, session_date)
);

CREATE INDEX idx_game_sessions_date ON game_sessions(session_date);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- =============================================
-- BETS TABLE
-- =============================================
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    bet_type VARCHAR(20) NOT NULL CHECK (bet_type IN ('jodi', 'haruf_andar', 'haruf_bahar')),
    bet_number VARCHAR(2) NOT NULL,
    bet_amount DECIMAL(10, 2) NOT NULL CHECK (bet_amount > 0),
    payout_multiplier DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'win', 'loss')),
    payout_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_session ON bets(game_session_id);
CREATE INDEX idx_bets_status ON bets(status);

-- =============================================
-- TRANSACTIONS TABLE (Audit Trail)
-- =============================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'bet', 'win', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    reference_id INTEGER,
    reference_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- =============================================
-- WITHDRAWAL REQUESTS TABLE
-- =============================================
CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    bank_details JSONB,
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);

-- =============================================
-- OTP TABLE (for authentication)
-- =============================================
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otps_phone ON otps(phone);
CREATE INDEX idx_otps_expires ON otps(expires_at);

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
