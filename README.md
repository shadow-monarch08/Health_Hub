# Health Hub 🏥

**Health Hub** is a secure, multi-profile health data aggregator designed to empower users with ownership of their medical records. It connects directly to healthcare providers (starting with **Epic Systems**) via standard FHIR APIs to fetch, compile, and display comprehensive Electronic Health Records (EHR).

Built with a focus on security, privacy, and user experience, Health Hub allows users to manage profiles for themselves and their dependents in one unified dashboard.

## 🚀 Key Features

-   **Secure Authentication**: Custom auth system with **Redis-backed OTP** (Email) for signup and generic login for returning users.
-   **Multi-Profile Management**: Create and manage distinct profiles (e.g., "Self", "Child", "Parent") to keep medical data organized.
-   **Epic Sandbox Integration**: Full **OAuth 2.0** implementation with PKCE to securely connect profiles to Epic's FHIR APIs.
-   **Aggregated EHR Data**: Fetches and displays:
    -   Patient Demographics
    -   Conditions & Diagnoses
    -   Allergies & Intolerances
    -   Medications (Active & Requested)
    -   Lab Results & Vital Signs (Observations)
    -   Immunizations
    -   Procedures & Encounters
-   **Robust Architecture**: 
    -   **Backend**: Encrypted token storage (AES placeholder), Rate-limited APIs, Centralized Error Handling.
    -   **Frontend**: Fault-tolerant data fetching (partial loads supported), Terminal-style raw data viewer.

## 🛠️ Tech Stack

### Client (Frontend)
-   **Framework**: React (v18) + Vite
-   **Language**: TypeScript
-   **Styling**: Plain CSS / Inline Styles (Clean, Terminal-inspired dark mode)
-   **Routing**: React Router Dom v6

### Server (Backend)
-   **Runtime**: Node.js + Express
-   **Language**: TypeScript
-   **Database**: PostgreSQL (via **Prisma ORM**)
-   **Caching/State**: Redis (for OTPs and OAuth State)
-   **Security**: Helmet, CORS, HPP, Compression

## 📂 Folder Structure

### `client/`
The React frontend application.
```text
client/
├── public/             # Static assets
├── src/
│   ├── api/            # API Client modules (Auth, Profile, EHR)
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page views (Auth, Dashboard, Onboarding, Callback)
│   ├── App.tsx         # Main routing logic
│   ├── config.ts       # Environment configuration
│   └── main.tsx        # Entry point
├── index.html
└── vite.config.ts
```

### `server/`
The Node.js/Express backend API.
```text
server/
├── prisma/             # DB Schema and Migrations
├── src/
│   ├── app/
│   │   ├── controllers/ # Request handlers (Auth, OAuth, EHR, Profile)
│   │   ├── middleware/  # Auth guards, Logging, Error handling
│   │   ├── routes/      # API Route definitions
│   │   └── services/    # Business logic (FHIR proxy, Token mgmt)
│   ├── config/          # Envs (logger, database, redis)
│   ├── redis/           # Redis client and helper services
│   └── index.ts         # App entry point
└── package.json
```

## ⚡ Getting Started

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL
-   Redis
-   An Epic on/off FHIR Sandbox App (Client ID)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/shadow-monarch08/Health_Hub.git
    cd Health_Hub
    ```

2.  **Setup Backend**
    ```bash
    cd server
    npm install
    # Create .env file with DB_URL, REDIS_URL, EPIC_CLIENT_ID, etc.
    npx prisma migrate dev
    npm run dev
    ```

3.  **Setup Frontend**
    ```bash
    cd client
    npm install
    npm run dev
    ```

## 🔐 Security Note
This project uses a standard `Bearer` token implementation for API access. OAuth tokens from Epic are stored in the database. Ensure `PROFILE_ENCRYPTION_KEY` is set in production to encrypt these sensitive tokens at rest.

---
*Built with ❤️ by Narendra*
