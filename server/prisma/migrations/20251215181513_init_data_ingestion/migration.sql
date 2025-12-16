-- CreateTable
CREATE TABLE "profile_fhir_resources_raw" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_fhir_resources_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_fhir_resources_normalized" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "canonicalCode" TEXT,
    "normalizedJson" JSONB NOT NULL,
    "normalizedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_fhir_resources_normalized_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_fhir_resources_clean" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "cleanJson" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_fhir_resources_clean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_summary" (
    "profileId" TEXT NOT NULL,
    "summaryJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'absent',
    "updatedAt" TIMESTAMPTZ,

    CONSTRAINT "profile_summary_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "profile_sync_jobs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,
    "error" TEXT,

    CONSTRAINT "profile_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_fhir_resources_raw_profileId_provider_resourceType__key" ON "profile_fhir_resources_raw"("profileId", "provider", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "profile_fhir_resources_raw" ADD CONSTRAINT "profile_fhir_resources_raw_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fhir_resources_normalized" ADD CONSTRAINT "profile_fhir_resources_normalized_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fhir_resources_clean" ADD CONSTRAINT "profile_fhir_resources_clean_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_summary" ADD CONSTRAINT "profile_summary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_sync_jobs" ADD CONSTRAINT "profile_sync_jobs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
