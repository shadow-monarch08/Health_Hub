/*
  Warnings:

  - A unique constraint covering the columns `[profileId,provider,resourceType,resourceId]` on the table `profile_fhir_resources_normalized` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `resourceId` to the `profile_fhir_resources_normalized` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profile_fhir_resources_normalized" ADD COLUMN     "resourceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "profile_fhir_resources_normalized_profileId_provider_resour_key" ON "profile_fhir_resources_normalized"("profileId", "provider", "resourceType", "resourceId");
