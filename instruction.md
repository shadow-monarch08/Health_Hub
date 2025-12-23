## Context

You are working on an existing **Node.js + TypeScript backend** for a healthcare platform (Health Hub).
The system currently supports **one EHR provider (Epic)** and is architected in a way that will **not scale cleanly** to multiple EHRs such as **Athena** and later **Cerner**.

The goal of this task is to **refactor the folder structure and responsibilities** to support **multiple EHR providers** using a **clean Adapter + Orchestrator architecture**, **without breaking existing functionality**.

This is a **structural refactor**, not a feature rewrite.

---

## 🎯 Objectives (Non-Negotiable)

1. **Preserve existing behavior**

   * No breaking API contracts
   * No DB schema changes
   * No behavioral changes to Epic integration

2. **Enable easy addition of new EHR providers**

   * Athena must be addable with minimal effort
   * No provider conditionals (`if/else`) outside EHR modules

3. **Enforce strict separation of concerns**

   * EHR-specific logic lives only inside EHR-specific folders
   * Shared logic is truly vendor-agnostic

4. **Maintain backward compatibility**

   * Existing imports must be updated carefully
   * Public service interfaces must remain stable

---

## 🧠 Core Architectural Principle (Must Follow)

> **EHR-specific logic must live in EHR-specific modules.
> Shared logic must never branch on provider.**

You must apply the **Adapter + Orchestrator pattern**.

---

## 🧱 Target Folder Structure (Final State)

You must refactor toward the following structure **without breaking the app**:

```text
src/app/
├── controllers/
│   ├── ehr.controller.ts          # Provider-agnostic
│   ├── oauth.controller.ts
│   ├── auth.controller.ts
│   └── profile.controller.ts
│
├── routes/
│   ├── ehr.routes.ts
│   ├── oauth.routes.ts
│   ├── auth.routes.ts
│   └── profile.routes.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   └── requestLogger.ts
│
├── ehr/                           # 🔥 New core module
│   ├── common/
│   │   ├── ehr.types.ts           # Canonical interfaces
│   │   ├── ehr.constants.ts
│   │   ├── unitRegistry.ts
│   │   ├── codeResolver.ts
│   │   └── ehrProvider.interface.ts
│   │
│   ├── epic/
│   │   ├── epic.fetcher.ts
│   │   ├── epic.normalizer.ts
│   │   ├── epic.cleaner.ts
│   │   ├── epic.oauth.ts
│   │   └── epic.config.ts
│   │
│   ├── athena/                    # Empty initially (scaffold only)
│   │   ├── athena.fetcher.ts
│   │   ├── athena.normalizer.ts
│   │   ├── athena.cleaner.ts
│   │   ├── athena.oauth.ts
│   │   └── athena.config.ts
│   │
│   └── ehr.registry.ts            # Provider resolver
│
├── services/
│   ├── sync/
│   │   ├── sync.service.ts        # Orchestrator only
│   │   ├── sync.worker.ts
│   │   └── syncStatus.service.ts
│   │
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── session.service.ts
│   │
│   ├── profile/
│   │   └── profile.service.ts
│   │
│   ├── crypto/
│   │   └── crypto.service.ts
│   │
│   └── notification/
│       └── email.service.ts
│
├── sse/
│   ├── sseBus.ts
│   └── sseSubscriber.ts
│
├── utils/
│   ├── validation/
│   └── logger.ts
│
└── index.ts
```

---

## 🔁 Refactoring Rules (VERY IMPORTANT)

### 1️⃣ Do NOT rewrite logic

* Move logic, do not redesign it
* Preserve method signatures unless explicitly stated

---

### 2️⃣ Split services, don’t overload them

| Existing File              | Refactor Action                       |
| -------------------------- | ------------------------------------- |
| `EHR.service.ts`           | Split into EHR-specific fetchers      |
| `Normalization.service.ts` | Split into provider normalizers       |
| `Cleaning.service.ts`      | Extract common logic, allow overrides |
| `OAuth.service.ts`         | Split per-provider OAuth handlers     |

---

### 3️⃣ Controllers MUST remain provider-agnostic

Controllers must NEVER:

* Import Epic/Athena files
* Branch on provider logic

Example (correct):

```ts
const ehr = EhrRegistry.get(provider);
await ehr.sync(profileId);
```

---

### 4️⃣ Introduce a strict EHR Provider Interface

Create `ehr/common/ehrProvider.interface.ts`:

```ts
export interface EhrProvider {
  fetch(profileId: string): Promise<void>;
  normalize(rawData: any[]): NormalizedRecord[];
  clean(normalizedData: NormalizedRecord[]): CleanRecord[];
  sync(profileId: string): Promise<void>;
}
```

All providers MUST implement this interface.

---

### 5️⃣ Implement `ehr.registry.ts`

This file is the **only place** allowed to map providers:

```ts
export const EhrRegistry = {
  epic: EpicProvider,
  athena: AthenaProvider
};
```

No other file should resolve providers.

---

## 📦 Import Refactoring Rules

You MUST:

* Update all imports to reflect new locations
* Avoid circular dependencies
* Prefer absolute imports if project already supports them
* Keep barrel exports minimal and explicit

Example:

```ts
// ❌ Old
import { normalize } from "../services/Normalization.service";

// ✅ New
import { normalizeEpic } from "@/app/ehr/epic/epic.normalizer";
```

---

## 🧪 Safety Checks (Must Pass)

After refactor:

* Epic sync flow must work unchanged
* OAuth flow must work unchanged
* Background sync jobs must work unchanged
* SSE updates must work unchanged
* All existing tests (if any) must pass

---

## 🚫 Hard Guardrails (DO NOT VIOLATE)

* ❌ No `if (provider === 'epic')` outside `ehr/`
* ❌ No shared normalizer across providers
* ❌ No provider logic in controllers
* ❌ No breaking API contracts
* ❌ No DB schema changes

---

## 📌 Output Expectations

When performing this task, you must:

1. Clearly state **what files are moved**
2. Clearly state **what files are split**
3. Provide **updated import paths**
4. Preserve all existing logic
5. Scaffold Athena provider with TODOs only (no implementation yet)

---

## 🧠 Mental Model to Follow

* **Raw data is immutable**
* **Normalization is provider-specific**
* **Cleaning is mostly generic**
* **Sync is orchestration only**
* **Providers are plug-ins, not branches**

---

## ✅ Final Goal

After this refactor:

> Adding Athena should require **only** creating files under `ehr/athena/`
> No existing code should need modification.

---

**Do not rush.
Do not simplify.
Do not invent features.
Execute this refactor precisely and safely.**