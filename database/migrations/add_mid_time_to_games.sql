-- Migration: Add mid_time and max_bet_after_mid_time to games table
-- This allows admin to set a time after which users can only bet a maximum amount

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS mid_time TIME,
ADD COLUMN IF NOT EXISTS max_bet_after_mid_time DECIMAL(10, 2) DEFAULT 100.00;

-- Add comment for documentation
COMMENT ON COLUMN games.mid_time IS 'Time after which max bet amount restriction applies';
COMMENT ON COLUMN games.max_bet_after_mid_time IS 'Maximum bet amount allowed after mid_time';
