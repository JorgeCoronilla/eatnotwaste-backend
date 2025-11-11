/*
  Warnings:

  - Added the required column `last_used` to the `user_products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_cache" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- AlterTable
ALTER TABLE "user_products" ADD COLUMN     "first_added" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_used" TIMESTAMPTZ NOT NULL;

-- CreateTable
CREATE TABLE "user_product_locations" (
    "id" UUID NOT NULL,
    "user_product_id" UUID NOT NULL,
    "list_type" "ListType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'units',
    "purchase_date" DATE,
    "expiry_date" DATE,
    "price" DECIMAL(10,2),
    "store" VARCHAR(255),
    "notes" TEXT,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMPTZ,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_product_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_product_locations_user_product_id_list_type_removed_at_idx" ON "user_product_locations"("user_product_id", "list_type", "removed_at");

-- AddForeignKey
ALTER TABLE "user_product_locations" ADD CONSTRAINT "user_product_locations_user_product_id_fkey" FOREIGN KEY ("user_product_id") REFERENCES "user_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
