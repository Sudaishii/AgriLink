-- Adds farm image support for farmer profile backgrounds
ALTER TABLE farms_table
  ADD COLUMN IF NOT EXISTS farm_image VARCHAR(255) NULL AFTER farm_name;
