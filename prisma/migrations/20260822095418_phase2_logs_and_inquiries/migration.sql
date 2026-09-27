/*
  Warnings:

  - The values [web,referral,walk_in] on the enum `InquirySource` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('new_vehicle', 'parts', 'repair');

-- CreateEnum
CREATE TYPE "PreferredTransaction" AS ENUM ('financing', 'cash', 'trade_in', 'lease', 'other');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('login', 'inquiry_created', 'inquiry_status_changed', 'inquiry_updated', 'inquiry_deleted', 'inquiry_restored', 'user_created', 'user_updated', 'user_deactivated', 'user_reactivated');

-- CreateEnum
CREATE TYPE "ActivityTargetType" AS ENUM ('inquiry', 'user');

-- AlterEnum
BEGIN;
CREATE TYPE "InquirySource_new" AS ENUM ('social', 'email', 'phone', 'physical');
ALTER TABLE "Inquiry" ALTER COLUMN "source" TYPE "InquirySource_new" USING ("source"::text::"InquirySource_new");
ALTER TYPE "InquirySource" RENAME TO "InquirySource_old";
ALTER TYPE "InquirySource_new" RENAME TO "InquirySource";
DROP TYPE "InquirySource_old";
COMMIT;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "inquiryType" "InquiryType",
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "preferredTransaction" "PreferredTransaction",
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "targetType" "ActivityTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "Inquiry_completedAt_idx" ON "Inquiry"("completedAt");

-- CreateIndex
CREATE INDEX "Inquiry_deletedAt_idx" ON "Inquiry"("deletedAt");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
