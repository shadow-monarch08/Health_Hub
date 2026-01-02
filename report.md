# Analysis of Encounter Data Storage

Here is the detailed analysis of how `Encounter` (Visits) data is currently stored and normalized in the system.

## Database Schema
The data is stored in the **`profile_fhir_resources_normalized`** table.
- **Table**: `profile_fhir_resources_normalized`
- **Key Columns**:
    - `resourceType`: `"Encounter"`
    - `canonicalCode`: SNOMED or CPT code for deduplication.
    - **`normalizedJson`**: JSONB column containing the standardized data.

## Normalized JSON Structure
Inside `normalizedJson`, the following structure is used:

```json
{
  "status": "finished",
  "class": "AMB", // Inpatient, outpatient, ambulatory, etc.
  "type": "General examination of patient (procedure)",
  "period": {
    "start": "2023-10-14T09:00:00Z",
    "end": "2023-10-14T09:30:00Z"
  },
  "location": "Main Street Clinic",
  "provider": "Dr. Alice Smith"
}
```

## Normalization Logic

### Common Logic (Epic & Athena)
The `Encounter` resources are normalized using the following mapping strategies:

1.  **Encounter Type (`type`)**:
    - Prioritizes the **Canonical Display** (SNOMED/CPT).
    - Fallback: `type[0].text`.
    - Fallback (Athena): `"Encounter"`.

2.  **Class**:
    - Extracted from `class.code` or `class.display` (e.g., IMP, AMB, EMER).

3.  **Period**:
    - Exact `start` and `end` times from `period`.

4.  **Location & Provider**:
    - **Location**: Display name of the *first* location in `location[]`.
    - **Provider**: Display name of the *first* participant in `participant[]`.

5.  **Canonical Code**:
    - **Epic**: Prioritizes `SNOMED` (`http://snomed.info/sct`).
    - **Athena**: Prioritizes `SNOMED`, then `CPT`.

## Data Source Specifics
- **Consistency**: Both providers share nearly identical logic, extracting the primary metadata defining a clinical visit.
- **Participants**: Only the first provider (likely the primary) is captured; support staff or secondary providers are currently ignored.
