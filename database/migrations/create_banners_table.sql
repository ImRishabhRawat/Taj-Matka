-- Create banners table for home page carousel
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    link_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active banners
CREATE INDEX idx_banners_active ON banners(is_active, display_order);

-- Create trigger for updated_at
CREATE TRIGGER update_banners_updated_at 
    BEFORE UPDATE ON banners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample banner
INSERT INTO banners (image_url, title, display_order, is_active) 
VALUES 
    ('https://via.placeholder.com/800x300/1a237e/ffffff?text=Welcome+to+Taj+Matka', 'Welcome Banner', 1, true);
