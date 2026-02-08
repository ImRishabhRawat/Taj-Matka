-- Add image_url column to popups table
ALTER TABLE popups ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN popups.image_url IS 'URL of the popup image (optional)';
