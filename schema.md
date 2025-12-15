# 🗄️ **📌 HEALTH HUB — MINIMAL DATABASE SCHEMA (v1)**

### *Simple • Normalized • Industry-Standard • Expandable*

---

# 1️⃣ **users**

Holds app-level user accounts.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 2️⃣ **profiles**

One user can manage many profiles (Self, Mom, Dad, etc.).

```sql
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name    TEXT NOT NULL,
    legal_name      TEXT,
    dob             DATE,
    relationship    TEXT,    -- e.g., "self", "mother", etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 3️⃣ **oauth_states**

Temporary table for protecting OAuth callback state (CSRF guard).

```sql
CREATE TABLE oauth_states (
    state           TEXT PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,     -- 'epic' | 'athena'
    expires_at      TIMESTAMPTZ NOT NULL
);
```

---

# 4️⃣ **profile_emr_connections**

Stores OAuth tokens per profile + provider.

```sql
CREATE TABLE profile_emr_connections (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider                TEXT NOT NULL,   -- epic | athena
    patient_emr_id          TEXT NOT NULL,

    access_token_encrypted  TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at              TIMESTAMPTZ,

    scope                   TEXT,
    status                  TEXT NOT NULL DEFAULT 'connected',
    last_error              TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_profile_provider
ON profile_emr_connections(profile_id, provider);
```

---

# 5️⃣ **profile_fhir_resources_raw**

Stores raw FHIR JSON (as received from EMR).

```sql
CREATE TABLE profile_fhir_resources_raw (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,
    resource_type   TEXT NOT NULL,     -- e.g. Condition, Observation, etc.
    resource_id     TEXT NOT NULL,     -- FHIR resource ID from provider
    resource_json   JSONB NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (profile_id, provider, resource_type, resource_id)
);
```

---

# 6️⃣ **profile_fhir_resources_normalized**

Stores normalized internal representations.

```sql
CREATE TABLE profile_fhir_resources_normalized (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,
    resource_type   TEXT NOT NULL,
    canonical_code  TEXT,          -- SNOMED, LOINC, RxNorm… when available
    normalized_json JSONB NOT NULL,
    normalized_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 7️⃣ **profile_fhir_resources_clean**

Deduped combined view across providers.

```sql
CREATE TABLE profile_fhir_resources_clean (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    resource_type   TEXT NOT NULL,
    clean_json      JSONB NOT NULL,
    sources         JSONB NOT NULL,    -- [{ provider, raw_id }]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 8️⃣ **profile_summary**

Precomputed dashboard snapshot.

```sql
CREATE TABLE profile_summary (
    profile_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    summary_json    JSONB,
    status          TEXT NOT NULL DEFAULT 'absent',  -- absent | syncing | ready | error
    updated_at      TIMESTAMPTZ
);
```

---

# 9️⃣ **profile_sync_jobs**

Worker job logs.

```sql
CREATE TABLE profile_sync_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    status              TEXT NOT NULL,  -- running | success | failed
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    resources_fetched   INT,
    error_message       TEXT
);