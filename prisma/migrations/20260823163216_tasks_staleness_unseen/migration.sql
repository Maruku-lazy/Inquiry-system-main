-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "InquirySeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquirySeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquirySeen_inquiryId_idx" ON "InquirySeen"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "InquirySeen_userId_inquiryId_key" ON "InquirySeen"("userId", "inquiryId");

-- AddForeignKey
ALTER TABLE "InquirySeen" ADD CONSTRAINT "InquirySeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquirySeen" ADD CONSTRAINT "InquirySeen_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
