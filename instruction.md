> **System Role:**
> You are a **Principal Backend Engineer & Healthcare Data Architect** with deep experience building scalable EHR aggregation systems.
> You prioritize correctness, bounded data models, and long-term operability over convenience.

---

## 🧠 CONTEXT (NON-NEGOTIABLE)

The system already implements a **three-layer medical data architecture**:

```
RAW        → Immutable external truth (FHIR as-is)
NORMALIZED → Provider-agnostic clinical facts (one event per row)
CLEAN      → Patient-facing, dashboard-ready summaries
```

The **CLEAN layer has been incorrectly implemented previously** by storing unbounded lists of historical data.

This prompt defines the **final, correct, irreversible contract** for the CLEAN layer.

---

## 🚨 CRITICAL FIRST STEP (MANDATORY)

### ❗ DELETE ALL EXISTING CLEAN DATA

Before implementing anything new:

* **Delete all rows** from `profile_fhir_resources_clean`
* Treat all existing data as **invalid**
* Rebuild CLEAN strictly from NORMALIZED

Reason:

> CLEAN is a derived projection.
> Incorrect projections must never be preserved.

---

## 🎯 PURPOSE OF `profile_fhir_resources_clean`

> **The CLEAN table stores a SMALL, BOUNDED, PATIENT-FACING SUMMARY of medical data — NOT history.**

It exists to answer:

* “What does the patient’s health look like right now?”
* “What should the dashboard show instantly?”
* “What is the latest clinically relevant state?”

It does **NOT** exist to:

* Store history
* Support pagination
* Act as a queryable data source
* Replace NORMALIZED

---

## 🧱 ABSOLUTE RULES (DO NOT VIOLATE)

1. **CLEAN MUST BE BOUNDED**

   * No unbounded arrays
   * No full history
   * Payload must stay small (< ~50KB)

2. **NO PAGINATION IN CLEAN**

   * If pagination is needed → data belongs in NORMALIZED

3. **ONE ROW PER (profile_id, resource_type)**

   * Enforced by DB uniqueness

4. **CLEAN IS REBUILDABLE**

   * Must be safe to delete and regenerate at any time

5. **CLEAN IS READ-OPTIMIZED**

   * Designed for dashboards and summaries only

---

## 🗂️ TABLE CONTRACT — `profile_fhir_resources_clean`

Each row represents **the system’s best current summary** for one resource type.

### Required Columns

* `profile_id`
* `resource_type`
* `clean_json` → summary only
* `sources` → contributing providers (deduplicated)
* `created_at`

### Uniqueness

```sql
UNIQUE (profile_id, resource_type)
```

---

## 🧹 HOW RAW & NORMALIZED DATA FEEDS CLEAN

### Source of truth

* CLEAN is derived **only** from `profile_fhir_resources_normalized`
* RAW is never read directly for CLEAN

### Input constraint

* Cleaning logic must operate on a **bounded subset**:

  * Latest records
  * Relevant records
  * Never full history

---

## 📦 WHAT `clean_json` MUST CONTAIN (BY RESOURCE)

### 🩺 Condition

* Active conditions only
* Most recent clinical status
* Onset date if known

```json
{
  "Hypertension": {
    "code": "I10",
    "status": "active",
    "onset_date": "2018-03-12"
  }
}
```

---

### 💊 MedicationRequest

* Currently active medications only
* Latest dosage & instructions
* Therapy type (acute vs long-term)

```json
{
  "Drospirenone–Ethinyl Estradiol": {
    "status": "active",
    "dose": "1 tablet",
    "frequency": "once daily",
    "route": "oral",
    "start_date": "2019-05-28"
  }
}
```

---

### 🧪 Observation (Labs & Vitals)

* Latest value per test
* Optional previous value
* Trend (if computable)

```json
{
  "Hemoglobin A1c": {
    "latest": {
      "value": 7.2,
      "unit": "%",
      "measured_at": "2024-02-20",
      "flag": "high"
    },
    "previous": {
      "value": 6.9,
      "measured_at": "2023-10-11"
    },
    "trend": "up"
  }
}
```

❌ Never store full lab history here.

---

### 💉 Immunization

* Vaccines received
* Latest dose per vaccine
* Completion status

---

### ⚠️ AllergyIntolerance

* Active allergies only
* Severity & reaction summary

---

### 🏥 Encounter / Procedure

* Most recent encounters only
* No full visit history

---

## 🧠 WHAT MUST NEVER GO INTO CLEAN

❌ Full historical series
❌ Paginated data
❌ Free-text notes
❌ Provider-specific metadata
❌ Raw FHIR JSON
❌ Data requiring filtering or querying

If it needs `LIMIT`, `OFFSET`, or `CURSOR` → it does NOT belong in CLEAN.

---

## 🔄 CLEANING STRATEGY (IMPLEMENTATION RULES)

1. Fetch **bounded normalized data**
2. Group by canonical clinical concept
3. Select “best” or “latest” record
4. Compute minimal derived fields (trend, status)
5. Overwrite existing CLEAN row atomically

CLEAN is **replace-on-write**, not incremental history.

---

## 🧪 ERROR HANDLING

* If cleaning fails:

  * Log error
  * Do NOT partially update CLEAN
* CLEAN must never be left in a half-built state

---

## 🧠 FINAL PRINCIPLE (DO NOT FORGET)

> **CLEAN is a summary, not a store.
> NORMALIZED is history, not UI.
> RAW is truth, not convenience.**

If any implementation violates this, **reject it**.

---

### ✅ BEGIN IMPLEMENTATION

1. **Delete all existing CLEAN data**
2. Enforce DB uniqueness
3. Rebuild CLEAN strictly per this contract
4. Validate payload size and boundedness