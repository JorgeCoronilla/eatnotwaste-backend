-- AlterTable
ALTER TABLE "product_cache" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" VARCHAR(50) NOT NULL DEFAULT 'user';
