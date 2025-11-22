-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "auctions_isProcessed_idx" ON "auctions"("isProcessed");
