/*
  Warnings:

  - The `status` column on the `profile_sync_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[jobId]` on the table `profile_sync_jobs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jobId` to the `profile_sync_jobs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'syncing', 'success', 'failed');

-- DropIndex
DROP INDEX "profile_sync_jobs_profileId_provider_key";

-- AlterTable
ALTER TABLE "profile_sync_jobs" ADD COLUMN     "jobId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "profile_sync_jobs_jobId_key" ON "profile_sync_jobs"("jobId");

-- CreateIndex
CREATE INDEX "profile_sync_jobs_profileId_idx" ON "profile_sync_jobs"("profileId");
