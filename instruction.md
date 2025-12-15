You are an **expert backend engineer** specializing in **Node.js, Express, Prisma, PostgreSQL, Redis, OAuth2 (SMART on FHIR), and secure system design**.

You are working on an **already existing backend codebase** where:

* Native user authentication is **already implemented**
* OAuth2 with Epic is **already implemented and working**
* Generic Epic FHIR resource proxying is **already implemented**
* Redis is already integrated
* Only the `users` table currently exists in the database
* **No medical data is persisted yet**

Your task is to **extend and solidify the backend** by implementing **profiles, durable OAuth persistence, and onboarding enforcement**, strictly following the phase-by-phase plan below.

---

# 🚨 ABSOLUTE NON-NEGOTIABLE RULES

1. **DO NOT rewrite existing OAuth logic unless explicitly required**
2. **DO NOT introduce new routes unless necessary**
3. **DO NOT break existing Epic FHIR resource fetching**
4. **DO NOT use Redis for identity or token storage**
5. **DO NOT store any FHIR medical data yet**
6. **DO NOT write tests — testing will be done later**
7. **DO NOT add frontend code**
8. **FOLLOW existing folder structure and patterns**
9. **If a file/folder already exists, MODIFY it — do not duplicate**
10. **Redis is ONLY for ephemeral state (OAuth state, later SSE/jobs)**

---

# 🧱 CORE ARCHITECTURAL PRINCIPLES (LOCKED)

You MUST follow these rules:

1. **User identity comes ONLY from native login**

   * Cookie / JWT / session middleware
   * No sessionId passed to frontend for identity

2. **Profiles are the unit of medical ownership**

   * All EHR connections attach to `profile_id`

3. **Postgres is the source of truth**

   * Users
   * Profiles
   * Profile ↔ EHR connections
   * Encrypted OAuth tokens

4. **Redis is ephemeral, non-identity state**

   * OAuth `state`
   * Rate limits
   * Background job progress (future)
   * SSE fan-out (future)

---

# ✅ PHASE-BY-PHASE IMPLEMENTATION (MANDATORY ORDER)

You MUST implement **each phase in order**.

---

## ✅ PHASE 1 — PROFILES (FOUNDATION)

### 1️⃣ Create `profiles` table (Prisma + DB)

Create the following table **exactly**:

```sql
profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  legal_name    TEXT,
  dob           DATE,
  relationship  TEXT,      -- self | mother | father | etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Backend rules:

* A profile MUST belong to exactly one user
* Users may have multiple profiles
* Profiles are the **owner of all medical/EHR data**

---

### 2️⃣ Add minimal Profile APIs

Implement ONLY:

* `POST /profiles` → create profile (used in onboarding)
* `GET /profiles` → list profiles for logged-in user

Enforce:

* Authenticated user only
* No cross-user access

🚫 Do NOT implement update/delete yet.

---

## ✅ PHASE 2 — OAUTH START (REDIS = STATE ONLY)

### 3️⃣ Implement Redis-based OAuth State

Implement a Redis helper/service using the following contract:

**Key**

```
oauth:state:<state>
```

**Value**

```json
{
  "userId": "<uuid>",
  "profileId": "<uuid>",
  "provider": "epic"
}
```

**TTL**

```
10 minutes
```

This **completely replaces** any DB-based OAuth state table.

---

### 4️⃣ Update `/oauth/start`

The endpoint MUST now require:

```json
{
  "profileId": "<uuid>",
  "provider": "epic"
}
```

Backend MUST:

1. Ensure user is authenticated
2. Ensure `profileId` belongs to user
3. Generate cryptographically secure `state`
4. Store state in Redis
5. Redirect to Epic OAuth URL with `state`

🚫 Do NOT store tokens
🚫 Do NOT write to DB here

---

## ✅ PHASE 3 — OAUTH CALLBACK → PERSIST CONNECTION (DB)

### 5️⃣ Create `profile_emr_connections` table

Create the following table **exactly**:

```sql
profile_emr_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL,   -- epic | athena (future)
  patient_emr_id          TEXT NOT NULL,

  access_token_encrypted  TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at              TIMESTAMPTZ,

  scope                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'connected',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (profile_id, provider)
);
```

This table is the **single source of truth** for OAuth credentials.

---

### 6️⃣ Update `/oauth/callback`

Modify the callback flow to:

1. Read `state` + `code`
2. Fetch Redis `oauth:state:<state>`
3. Validate:

   * State exists & not expired
   * `userId` matches authenticated user
   * `profileId` exists & belongs to user
   * Provider matches
4. Exchange `code` → access token, refresh token, patient ID
5. **UPSERT into `profile_emr_connections`**
6. Delete Redis OAuth state
7. Redirect frontend (NO sessionId in URL)

🚫 DO NOT create Redis sessions
🚫 DO NOT return sessionId

---

## ✅ PHASE 4 — ONBOARDING ENFORCEMENT

### 7️⃣ Add onboarding flag to `users`

Add the following column:

```sql
users.onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
```

---

### 8️⃣ Define onboarding completion rule

Set `onboarding_completed = true` **ONLY when**:

* User has ≥ 1 profile
* That profile has ≥ 1 active `profile_emr_connection`

This update MUST occur **inside OAuth callback** after DB insert succeeds.

---

### 9️⃣ Gate application entry

Ensure backend exposes onboarding state via `/me`.

Frontend (already implemented separately) will:

* Redirect to onboarding if `onboarding_completed = false`
* Redirect to dashboard otherwise

Backend must simply provide correct data.

---

## ✅ PHASE 5 — UPDATE EHR FETCH FLOW (REMOVE REDIS IDENTITY)

### 🔟 Refactor `/api/v1/ehr/:resource`

Current (testing):

```
Frontend → sessionId → Redis → token
```

Replace with:

```
Frontend → authenticated request + profileId
Backend → DB → token → Epic
```

Example request:

```
GET /api/v1/ehr/:resource?profileId=<uuid>
```

Backend MUST:

1. Resolve authenticated `userId`
2. Verify user owns `profileId`
3. Load tokens from `profile_emr_connections`
4. Refresh token if expired
5. Proxy request to Epic FHIR API
6. Return raw response

🚫 Redis must NOT be used here.

---

## ✅ PHASE 6 — FINAL REDIS ROLE (NO EXPANSION)

Redis MUST be used ONLY for:

* OAuth state (`oauth:state:*`)
* (Future) background jobs
* (Future) SSE fan-out
* (Future) rate limiting

🚫 No tokens
🚫 No identity
🚫 No profile resolution

---

# 🛑 EXPLICITLY DO NOT IMPLEMENT (YET)

* ❌ Medical data persistence
* ❌ FHIR normalization
* ❌ Deduplication
* ❌ Analytics
* ❌ SSE
* ❌ Background workers
* ❌ Tests

---

# 📦 EXPECTED DELIVERABLES

You MUST return:

1. Prisma schema updates (`profiles`, `profile_emr_connections`, user flag)
2. Updated OAuth start & callback logic
3. Profile APIs (create + list)
4. Updated `/ehr/:resource` resolution logic
5. Redis OAuth state helper/service
6. Clean, production-grade code matching existing architecture

---

# 🧠 FINAL NOTE

If you are uncertain at any step:

* **Inspect existing code**
* **Follow existing patterns**
* **Do NOT invent new abstractions**

This implementation must be **incremental, safe, and compatible** with the current backend.