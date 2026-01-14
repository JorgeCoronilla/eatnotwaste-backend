-- DropIndex
DROP INDEX "products_brand_trgm_idx";

-- DropIndex
DROP INDEX "products_name_trgm_idx";

-- AlterTable
ALTER TABLE "product_cache" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "health_score" JSONB;
