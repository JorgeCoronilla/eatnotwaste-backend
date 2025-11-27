/*
  Warnings:

  - You are about to drop the column `brand_translations` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `category_translations` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `description_translations` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `ingredients_translations` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `name_translations` on the `products` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ProductSource" ADD VALUE 'llm';

-- AlterTable
ALTER TABLE "product_cache" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "brand_translations",
DROP COLUMN "category_translations",
DROP COLUMN "description_translations",
DROP COLUMN "ingredients_translations",
DROP COLUMN "name_translations";
