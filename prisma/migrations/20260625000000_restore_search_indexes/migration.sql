-- Restore search indexes that were dropped in 20260110104030_add_health_score.
-- Those indexes were created via raw SQL and not registered in schema.prisma,
-- so Prisma's migrate dev treated them as drift and dropped them.
-- This migration also adds:
--   1. immutable_unaccent() wrapper (needed for a functional index on unaccent())
--   2. Functional index for exact-match queries (unaccent + lower)
--
-- PRODUCTION NOTE: GIN index creation can lock the table briefly.
-- In large prod tables, run CREATE INDEX CONCURRENTLY outside a transaction
-- (as a maintenance script, not via prisma migrate).

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- IMMUTABLE wrapper around unaccent() so it can be used in a functional index.
-- unaccent() itself is STABLE, not IMMUTABLE, so Postgres refuses to index it directly.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Functional index used by exact-match step in searchLocal:
--   WHERE immutable_unaccent(lower(name)) = $q
CREATE INDEX IF NOT EXISTS products_name_unaccent_lower_idx
  ON products (immutable_unaccent(lower(name)));

-- Trigram indexes for fuzzy / similarity() queries.
-- Also declared in schema.prisma (type: Gin) to prevent future migrate drift.
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_brand_trgm_idx
  ON products USING gin (brand gin_trgm_ops);

-- Partial unique index: prevents persisting duplicate LLM-generated products
-- for the same normalised name. The app checks this with a findFirst before
-- create, but this index is the DB-level safety net.
CREATE UNIQUE INDEX IF NOT EXISTS products_llm_name_unique_idx
  ON products (immutable_unaccent(lower(name)))
  WHERE source = 'llm';
