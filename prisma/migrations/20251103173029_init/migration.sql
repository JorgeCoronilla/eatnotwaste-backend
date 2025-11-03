-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('shopping', 'fridge', 'freezer', 'pantry');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('openfoodfacts', 'chomp', 'manual', 'catalog');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('add', 'remove', 'move', 'consume', 'expire', 'update');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('android', 'ios', 'web');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'delivered', 'failed', 'read', 'clicked');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "barcode" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255),
    "category" VARCHAR(100),
    "subcategory" VARCHAR(100),
    "description" TEXT,
    "image_url" TEXT,
    "nutritional_info" JSONB NOT NULL DEFAULT '{}',
    "allergens" TEXT[],
    "ingredients" TEXT,
    "source" "ProductSource" NOT NULL DEFAULT 'manual',
    "source_id" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_movements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_item_id" UUID,
    "product_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "from_list" "ListType",
    "to_list" "ListType",
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'units',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cache" (
    "id" UUID NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "source" "ProductSource" NOT NULL,
    "product_data" JSONB NOT NULL,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    "hit_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "app_version" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_token_id" UUID,
    "notification_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "clicked_at" TIMESTAMPTZ,
    "status" "NotificationStatus" NOT NULL DEFAULT 'sent',

    CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expiry_alerts" BOOLEAN NOT NULL DEFAULT true,
    "expiry_days_before" INTEGER NOT NULL DEFAULT 2,
    "shopping_reminders" BOOLEAN NOT NULL DEFAULT true,
    "shopping_reminder_time" VARCHAR(8) NOT NULL DEFAULT '10:00:00',
    "shopping_reminder_days" INTEGER[] DEFAULT ARRAY[1, 3, 5]::INTEGER[],
    "weekly_summary" BOOLEAN NOT NULL DEFAULT true,
    "weekly_summary_day" INTEGER NOT NULL DEFAULT 0,
    "weekly_summary_time" VARCHAR(8) NOT NULL DEFAULT '18:00:00',
    "recommendations" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_items_user_id_product_id_list_type_purchase_date_expir_key" ON "user_items"("user_id", "product_id", "list_type", "purchase_date", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "product_cache_barcode_source_key" ON "product_cache"("barcode", "source");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_tokens_user_id_device_id_key" ON "user_device_tokens"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_key" ON "user_notification_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_movements" ADD CONSTRAINT "item_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_movements" ADD CONSTRAINT "item_movements_user_item_id_fkey" FOREIGN KEY ("user_item_id") REFERENCES "user_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_movements" ADD CONSTRAINT "item_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_device_token_id_fkey" FOREIGN KEY ("device_token_id") REFERENCES "user_device_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
