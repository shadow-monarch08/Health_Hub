# Epic Data Handling Implementation Overview

This document provides a technical deep-dive into the current implementation of Epic EHR integration within Health Hub. The architecture follows a strict "Fetch -> Normalize -> Clean" pipeline designed for scalability and data integrity.

## 1. Authentication & Connection
**File:** `app/ehr/epic/epic.oauth.ts`, `app/controllers/oauth.controller.ts`

The authentication flow uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) to securely connect to Epic.

-   **Initiation**: `createAuthorizationRedirect` generates a secure URL with a unique `state` (stored in Redis) and redirects the user to Epic's authorization page.
-   **Scopes**: Request access to `Patient`, `Observation`, `Condition`, `MedicationRequest`, etc.
-   **Callback**: `exchangeCodeForToken` swaps the authorization code for an `access_token` and `patient_id`.
-   **Storage**: Tokens are encrypted and stored in `ProfileEmrConnection` (PostgreSQL). Redis is used transiently for the OAuth handshake state.

## 2. Synchronization Architecture
**File:** `app/services/sync/sync.service.ts`, `jobs/workers/sync.worker.ts`, `app/ehr/epic/provider.ts`

Synchronization is an asynchronous background process managed by BullMQ.

1.  **Trigger**: `SyncService.createSyncJob` pushes a job to the `syncQueue` and creates a `ProfileSyncJob` record (status: `pending`).
2.  **Worker**: `syncWorker` picks up the job and calls `SyncService.syncProfile`.
3.  **Orchestration**: `SyncService` resolves the provider (Epic) and calls `EhrRegistry.get('epic').sync(profileId, jobId)`.
4.  **Provider Logic** (`EpicProvider.sync`):
    -   Retrieves decrypted connection details.
    -   Iterates through a defined list of resources: `['Patient', 'MedicationRequest', 'Condition', 'Observation', 'Immunization', 'AllergyIntolerance', 'Encounter', 'Procedure']`.
    -   Executes the **Data Pipeline** for each resource.
    -   Updates `ProfileSyncJob` status to `success` or `failed`.
    -   Publishes real-time progress events via Redis Pub/Sub (`sse:${jobId}`).

## 3. Data Pipeline (The 3-Layer Model)

The core data processing logic is housed in `app/ehr/epic/` and strictly separates raw data from processed summaries.

### Layer 1: Raw Data (Ingestion)
**File:** `app/ehr/epic/epic.fetcher.ts`
-   **Action**: Fetches FHIR JSON resources directly from Epic's API.
-   **Storage**: `ProfileFhirResourceRaw` table.
-   **Schema**: Stores the exact JSON received from Epic. Keyed by `resourceId`.
-   **Philosophy**: "Source of Truth". Never modified, only overwritten by fresher fetches.

### Layer 2: Normalization (Standardization)
**File:** `app/ehr/epic/epic.normalizer.ts`
-   **Action**: Transforms raw FHIR JSON into a simplified, flat structure.
-   **Storage**: `ProfileFhirResourceNormalized` table.
-   **Features**:
    -   Extracts key fields (Data, Value, Unit, Status).
    -   Maps codes to Canonical Codes (RxNorm, LOINC, SNOMED) where possible.
    -   Handles resource-specific logic (e.g., extracting dosage from `MedicationRequest`).
    -   Upserts based on `resourceId`.

### Layer 3: Cleaning (Aggregation & Summary)
**File:** `app/ehr/epic/epic.cleaner.ts`
-   **Action**: Aggregates all normalized records for a specific resource type into a single "Clean" summary.
-   **Storage**: `ProfileFhirResourceClean` table.
-   **Philosophy**: "Summary Not History".
-   **Logic**:
    -   **Filtering**: Discards inactive/resolved items (e.g., stopped meds, healed conditions) depending on logic.
    -   **Deduplication**: Merges duplicate entries based on Canonical Code or Name.
    -   **Conflict Resolution**: Uses the "latest wins" strategy for conflicting data points.
    -   **Output**: A single JSON object containing the user-facing list for that resource type (e.g., "Active Medications").

## 4. Real-time Feedback
**File:** `app/sse/sseSubscriber.ts`, `app/services/sync/sync.service.ts`

The frontend receives updates via Server-Sent Events (SSE).
-   Events: `fetching`, `fetched`, `normalizing`, `cleaning`, `complete`, `failed`.
-   Channel: `sse:${jobId}`.
-   Mechanism: Redis Pub/Sub bridges the background worker and the API server to push updates to the client.

## 5. Database Schema Key Models
-   `ProfileEmrConnection`: Auth credentials.
-   `ProfileSyncJob`: Audit trail of sync attempts.
-   `ProfileFhirResourceRaw`: Raw FHIR dumps.
-   `ProfileFhirResourceNormalized`: Standardized individual records.
-   `ProfileFhirResourceClean`: Aggregated, display-ready summaries.
