-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'paris',
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unit_ids" JSONB;

-- CreateTable
CREATE TABLE "inventory_units" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'paris',
    "status" "ProductStatus" NOT NULL DEFAULT 'available',
    "condition" "ProductCondition" NOT NULL DEFAULT 'new',
    "cycle_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_units_product_id_city_status_idx" ON "inventory_units"("product_id", "city", "status");

-- CreateIndex
CREATE INDEX "inventory_units_city_status_idx" ON "inventory_units"("city", "status");

-- CreateIndex
CREATE INDEX "order_items_product_id_city_idx" ON "order_items"("product_id", "city");

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
