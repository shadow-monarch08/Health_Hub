# 🎯 **Prompt: Fix MedicationRequest (FHIR R4) Normalization Logic**

You are an **expert backend engineer working on the Health Hub backend**.

Your task is to **modify ONLY the normalization logic for the FHIR `MedicationRequest` resource** (Prescriptions / Orders).
⚠️ **Do NOT modify normalization logic for any other FHIR resource types.**

---

## 🧱 Context (Existing System)

* Normalized records are stored in:
  **`profile_fhir_resources_normalized`**
* Prisma model:
  **`ProfileFhirResourceNormalized`**
* Normalized data is stored in:
  **`normalizedJson` (JSONB column)**
* Canonical identifiers are stored in:
  **`canonicalCode`**
* Canonical code resolution logic already exists:

  * RxNorm (primary)
  * SNOMED (fallback)
    ⚠️ This logic must remain unchanged.

---

## ❌ Current Problems (Must Be Fixed)

1. `intent` is not stored (orders vs plans are indistinguishable)
2. `status` is oversimplified and collapsed
3. Dosage is overly rigid and loses free-text instructions
4. PRN (“as needed”) information is lost
5. Multiple `dosageInstruction[]` entries are ignored
6. Medication reason is flattened and loses Condition linkage
7. Derived course duration is not explicitly marked as derived

---

## ✅ Required Changes

**Apply the following changes ONLY when `resourceType === "MedicationRequest"`**

---

## 🔧 Normalization Rules (Authoritative)

---

### 1️⃣ Preserve medication intent (CRITICAL)

Add:

```json
"intent": "order | plan | proposal | original-order | instance-order"
```

Rules:

* Extract directly from `MedicationRequest.intent`
* Do NOT infer
* Do NOT default to `"order"`

---

### 2️⃣ Preserve full MedicationRequest status

#### ❌ Old

```json
"status": "active"
```

#### ✅ New

```json
"status": "active | on-hold | stopped | completed | cancelled | draft | entered-in-error"
```

Rules:

* Extract exact FHIR status
* Do NOT collapse or remap values
* `entered-in-error` must be preserved verbatim

---

### 3️⃣ Preserve structured dosage **and** raw dosage text

Replace single dosage object with an array:

```json
"dosages": [
  {
    "dosageText": "Take one capsule by mouth three times daily",
    "amount": 500,
    "unit": "mg",
    "route": "Oral",
    "frequency_per_day": 3,
    "isPRN": false
  }
]
```

Rules:

* One normalized entry per `dosageInstruction[]`
* Always preserve `dosageInstruction.text`
* Extract PRN from:

  * `asNeededBoolean`
  * `asNeededCodeableConcept`
* Do NOT merge multiple dosage instructions

---

### 4️⃣ Support complex and incomplete dosing safely

Rules:

* If structured timing cannot be resolved:

  * Preserve `dosageText`
  * Leave numeric fields as `null`
* Do NOT infer frequency or amount
* Do NOT attempt tapering or schedule logic

---

### 5️⃣ Preserve medication reason (text + linkage)

```json
"reason": {
  "text": "Bacterial infection",
  "conditionRefs": ["Condition/abc123"]
}
```

Rules:

* Extract from:

  * `reasonCode[].text`
  * `reasonReference[]`
* Preserve references without resolving Condition data
* Do NOT drop free-text reason

---

### 6️⃣ Make course timing explicit and mark derived values

```json
"course": {
  "start": "2023-10-14",
  "end": "2023-10-21",
  "duration_days": 7,
  "derived": true
}
```

Rules:

* Extract `start` from:

  * `authoredOn`
  * or `dispenseRequest.validityPeriod.start`
* Extract `end` only if explicitly provided
* If `duration_days` is calculated, mark `"derived": true`
* Do NOT imply clinical certainty

---

### 7️⃣ Keep medication identity logic unchanged

✔ Keep RxNorm canonicalCode logic
✔ Keep medication name extraction
✔ Do NOT move Medication resource logic here
✔ Medication form is optional and must not be inferred

---

## 📦 Final Required Normalized JSON Shape (MedicationRequest)

```json
{
  "status": "active",
  "intent": "order",

  "medication": {
    "name": "Amoxicillin 500 MG",
    "canonicalCode": "723"
  },

  "dosages": [
    {
      "dosageText": "Take one capsule by mouth three times daily",
      "amount": 500,
      "unit": "mg",
      "route": "Oral",
      "frequency_per_day": 3,
      "isPRN": false
    }
  ],

  "course": {
    "start": "2023-10-14",
    "end": "2023-10-21",
    "duration_days": 7,
    "derived": true
  },

  "supply": {
    "days": 7,
    "refills": 0
  },

  "reason": {
    "text": "Bacterial infection",
    "conditionRefs": []
  }
}
```

---

## 🚫 Explicit Constraints (DO NOT VIOLATE)

* ❌ Do NOT modify normalization for any other FHIR resource
* ❌ Do NOT infer adherence or “currently taking”
* ❌ Do NOT collapse dosage instructions
* ❌ Do NOT default intent or status
* ❌ Do NOT change database schema
* ❌ Do NOT introduce medication classification logic

---

## ✅ Deliverables

* Updated normalization logic for **MedicationRequest only**
* Intent-aware, status-faithful prescription records
* Backward-compatible UX output
* Safe handling of complex dosing instructions

---

## 🧠 Goal

After this change:

* Prescriptions vs plans are distinguishable
* Dosage instructions are faithful to clinician intent
* Medication lists are accurate
* Data remains FHIR-correct and audit-safe