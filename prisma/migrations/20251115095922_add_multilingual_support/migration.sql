-- Update default using Postgres-compatible syntax (unquoted identifiers)
ALTER TABLE product_cache
  ALTER COLUMN expires_at SET DEFAULT now() + interval '30 days';

-- Add translation columns individually (unquoted identifiers)
ALTER TABLE products ADD COLUMN brand_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN category_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN description_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN ingredients_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN name_translations JSONB NOT NULL DEFAULT '{}'::jsonb;