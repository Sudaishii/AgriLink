-- Add CLIP embedding storage column to product table
-- This stores a JSON array of floats (512-dimensional CLIP ViT-Base/32 vector)
ALTER TABLE product_table
ADD COLUMN IF NOT EXISTS p_image_embedding LONGTEXT DEFAULT NULL
COMMENT 'CLIP ViT-Base/32 image embedding stored as JSON float array';
