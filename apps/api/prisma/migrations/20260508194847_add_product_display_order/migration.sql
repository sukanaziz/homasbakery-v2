-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_displayOrder_idx" ON "Product"("displayOrder");
