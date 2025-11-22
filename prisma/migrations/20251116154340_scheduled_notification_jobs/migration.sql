/*
  Warnings:

  - You are about to drop the column `isProcessed` on the `auctions` table. All the data in the column will be lost.
  - You are about to drop the column `isCleared` on the `notifications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'EXECUTED', 'FAILED', 'CANCELLED');

-- DropIndex
DROP INDEX "public"."auctions_isProcessed_idx";

-- DropIndex
DROP INDEX "public"."notifications_createdAt_idx";

-- DropIndex
DROP INDEX "public"."notifications_userId_isCleared_idx";

-- AlterTable
ALTER TABLE "auctions" DROP COLUMN "isProcessed";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "isCleared";

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_jobs_auctionId_key" ON "scheduled_jobs"("auctionId");

-- CreateIndex
CREATE INDEX "scheduled_jobs_scheduledAt_status_idx" ON "scheduled_jobs"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "scheduled_jobs_auctionId_idx" ON "scheduled_jobs"("auctionId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
