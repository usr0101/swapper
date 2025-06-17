-- Add platform branding fields to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS platform_name text DEFAULT 'Swapper',
ADD COLUMN IF NOT EXISTS platform_description text DEFAULT 'Real NFT Exchange',
ADD COLUMN IF NOT EXISTS platform_icon text DEFAULT '⚡';

-- Update existing records to have default values
UPDATE admin_settings 
SET 
  platform_name = COALESCE(platform_name, 'Swapper'),
  platform_description = COALESCE(platform_description, 'Real NFT Exchange'),
  platform_icon = COALESCE(platform_icon, '⚡')
WHERE platform_name IS NULL OR platform_description IS NULL OR platform_icon IS NULL;