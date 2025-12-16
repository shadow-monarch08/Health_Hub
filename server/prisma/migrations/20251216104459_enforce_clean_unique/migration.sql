/*
  Warnings:

  - A unique constraint covering the columns `[profileId,resourceType]` on the table `profile_fhir_resources_clean` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "profile_fhir_resources_clean_profileId_resourceType_key" ON "profile_fhir_resources_clean"("profileId", "resourceType");
