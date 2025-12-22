/*
  Warnings:

  - A unique constraint covering the columns `[profileId,provider]` on the table `profile_sync_jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "profile_sync_jobs" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'epic';

-- CreateIndex
CREATE UNIQUE INDEX "profile_sync_jobs_profileId_provider_key" ON "profile_sync_jobs"("profileId", "provider");
