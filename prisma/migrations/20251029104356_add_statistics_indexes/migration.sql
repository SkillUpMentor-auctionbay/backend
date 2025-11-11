/*
  Warnings:

  - You are about to drop the column `currentBid` on the `auctions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `auctions` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."users_username_key";

-- AlterTable
ALTER TABLE "auctions" DROP COLUMN "currentBid",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "profile_picture_url" TEXT,
ADD COLUMN     "surname" TEXT NOT NULL,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "public"."AuctionStatus";

-- CreateIndex
CREATE INDEX "auctions_sellerId_endTime_idx" ON "auctions"("sellerId", "endTime");

-- CreateIndex
CREATE INDEX "auctions_sellerId_createdAt_idx" ON "auctions"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "bids_bidderId_idx" ON "bids"("bidderId");

-- CreateIndex
CREATE INDEX "bids_bidderId_auctionId_idx" ON "bids"("bidderId", "auctionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
