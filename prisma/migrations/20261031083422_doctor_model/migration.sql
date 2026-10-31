/*
  Warnings:

  - The `additionalFiles` column on the `doctors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_userId_fkey";

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "resumePublicId" TEXT,
DROP COLUMN "additionalFiles",
ADD COLUMN     "additionalFiles" JSONB;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
