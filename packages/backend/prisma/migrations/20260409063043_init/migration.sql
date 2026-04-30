-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('new', 'excellent', 'good', 'fair', 'end_of_life');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('available', 'reserved', 'rented', 'in_cleaning', 'in_inspection', 'retired', 'donated');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('vinted', 'wholesale', 'donated_in', 'direct_purchase');

-- CreateEnum
CREATE TYPE "ProductGender" AS ENUM ('men', 'women', 'unisex');

-- CreateEnum
CREATE TYPE "ProductSeason" AS ENUM ('spring_summer', 'fall_winter', 'all_season');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'active_rental', 'return_initiated', 'return_in_transit', 'returned', 'inspecting', 'completed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('personal', 'mondial_relay', 'chronopost', 'colissimo');

-- CreateEnum
CREATE TYPE "DeliveryDirection" AS ENUM ('outbound', 'return');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('scheduled', 'picked_up', 'in_transit', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('rental', 'deposit', 'damage_fee', 'refund');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "LifecycleEventType" AS ENUM ('added_to_inventory', 'rented', 'returned', 'cleaned', 'inspected', 'condition_changed', 'repaired', 'marked_for_donation', 'donated');

-- CreateEnum
CREATE TYPE "CapsuleCategory" AS ENUM ('beach', 'business', 'city', 'winter', 'wedding', 'casual');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'FR',
    "instructions" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_fr" TEXT NOT NULL,
    "description_es" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "size_eu" TEXT NOT NULL,
    "size_uk" TEXT,
    "size_us" TEXT,
    "color" TEXT NOT NULL,
    "material" TEXT,
    "weight_grams" INTEGER NOT NULL,
    "gender" "ProductGender" NOT NULL,
    "season" "ProductSeason" NOT NULL,
    "condition" "ProductCondition" NOT NULL DEFAULT 'new',
    "cycle_count" INTEGER NOT NULL DEFAULT 0,
    "max_cycles" INTEGER NOT NULL,
    "purchase_price" DECIMAL(10,2) NOT NULL,
    "rental_price_per_day" DECIMAL(10,2) NOT NULL,
    "source" "ProductSource" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'available',
    "city" TEXT NOT NULL DEFAULT 'paris',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lifecycle_log" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "event_type" "LifecycleEventType" NOT NULL,
    "order_id" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_lifecycle_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capsule_wardrobes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_fr" TEXT NOT NULL,
    "description_es" TEXT NOT NULL,
    "category_type" "CapsuleCategory" NOT NULL,
    "season" "ProductSeason" NOT NULL,
    "gender" "ProductGender" NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capsule_wardrobes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capsule_wardrobe_items" (
    "id" TEXT NOT NULL,
    "capsule_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "capsule_wardrobe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "rental_start" DATE NOT NULL,
    "rental_end" DATE NOT NULL,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "carbon_saved_kg" DECIMAL(10,3),
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_at_time" DECIMAL(10,2) NOT NULL,
    "condition_at_rent" "ProductCondition" NOT NULL,
    "cycle_at_rent" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stripe_session_id" TEXT,
    "stripe_payment_intent" TEXT,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "DeliveryMethod" NOT NULL,
    "direction" "DeliveryDirection" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'scheduled',
    "tracking_code" TEXT,
    "carrier" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "fee" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_savings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "luggage_co2_kg" DECIMAL(10,3) NOT NULL,
    "reuse_co2_kg" DECIMAL(10,3) NOT NULL,
    "total_co2_kg" DECIMAL(10,3) NOT NULL,
    "items_reused" INTEGER NOT NULL,
    "weight_avoided_kg" DECIMAL(10,3) NOT NULL,
    "calculation_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carbon_savings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_city_idx" ON "products"("status", "city");

-- CreateIndex
CREATE INDEX "products_category_id_gender_season_idx" ON "products"("category_id", "gender", "season");

-- CreateIndex
CREATE INDEX "products_size_eu_idx" ON "products"("size_eu");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_lifecycle_log_product_id_idx" ON "product_lifecycle_log"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "capsule_wardrobes_slug_key" ON "capsule_wardrobes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "capsule_wardrobe_items_capsule_id_category_id_key" ON "capsule_wardrobe_items"("capsule_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_rental_start_rental_end_idx" ON "orders"("rental_start", "rental_end");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_order_id_idx" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_scheduled_at_status_idx" ON "deliveries"("scheduled_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_savings_order_id_key" ON "carbon_savings"("order_id");

-- CreateIndex
CREATE INDEX "carbon_savings_user_id_idx" ON "carbon_savings"("user_id");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycle_log" ADD CONSTRAINT "product_lifecycle_log_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycle_log" ADD CONSTRAINT "product_lifecycle_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capsule_wardrobe_items" ADD CONSTRAINT "capsule_wardrobe_items_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule_wardrobes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capsule_wardrobe_items" ADD CONSTRAINT "capsule_wardrobe_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_savings" ADD CONSTRAINT "carbon_savings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_savings" ADD CONSTRAINT "carbon_savings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
