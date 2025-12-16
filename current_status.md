# Health Hub - Current Project Status

## 1. System Architecture
The system logic is fully implemented with a robust **three-layer data pipeline** and secure authentication.

*   **Auth Layer**: Handles User signup/login.
*   **OAuth Layer**: Manages secure connections to Epic EHR (with new encryption).
*   **Data Pipeline**:
    *   **Raw**: Stores exact FHIR JSON from Epic (Audit trail).
    *   **Normalized**: Standardizes data (SNOMED/RxNorm codes).
    *   **Clean**: **Summary-Only** view for the frontend (Latest Vitals, Active Meds).

## 2. Important API Routes
These are the key endpoints currently active in the server:

### 🏥 EHR Data Routes (`/api/v1/ehr`)
| Method | Route | Description |
| :--- | :--- | :--- |
| **POST** | `/sync` | **Background Sync**. Triggers a fresh fetch of all medical data (Patient, Meds, Labs, etc.) from Epic. |
| **GET** | `/:resource?mode=clean` | **Dashboard Data**. Fetches the **Clean Summary** for a resource (e.g., `Observation`). |
| **GET** | `/:resource` | **Raw Data**. Fetches the raw FHIR data (optional for debugging). |

### 🔐 OAuth Routes (`/api/v1/OAuth`)
| Method | Route | Description |
| :--- | :--- | :--- |
| **GET** | `/epic/authorize` | Initiates the connection to Epic (Redirects user). |
| **GET** | `/epic/callback` | Handles the return from Epic, exchanges codes, and **encrypts** tokens. |

### 👤 Auth Routes (`/api/v1/auth`)
| Method | Route | Description |
| :--- | :--- | :--- |
| **POST** | `/signup` | User registration. |
| **POST** | `/login` | User login. |
| **POST** | `/verify-otp` | OTP verification. |
| **GET** | `/me` | Get current user profile. |

## 3. Current Stability Status
*   **Database**: Wiped and clean. Ready for fresh data.
*   **Schema**: Strict Unique Constraint enforced on Clean tables.
*   **Encryption**: **FIXED**. Access tokens are now encrypted at rest.
*   **Logic**: `CleaningService` now strictly isolates "Active/Latest" data, preventing history bloat.

## 4. Next Actions
The system is ready for an **End-to-End Test**:
1.  **Frontend**: Click "Connect to Epic".
2.  **Backend**: Watch the logs for "Sync Job Started" and "Cleaned [Resource]".
3.  **Dashboard**: Verify that the "Summary Cards" show only the latest relevant data.
