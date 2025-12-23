# Server App Folder Structure

## Folder Structure Sketch

```text
src/app/
├── controllers/          # Request handlers for API endpoints
│   ├── EHR.controller.ts
│   ├── OAuth.controller.ts
│   ├── auth.controller.ts
│   └── profile.controller.ts
│
├── middleware/           # Express middleware (auth, logging, etc.)
│   ├── auth.middleware.ts
│   └── requestLogger.ts
│
├── routes/               # Route definitions mapping paths to controllers
│   ├── EHR.routes.ts
│   ├── OAuth.routes.ts
│   ├── auth.routes.ts
│   └── profile.routes.ts
│
├── services/             # Business logic and complex operations
│   ├── Cleaning.service.ts       # Logic for cleaning/deduping FHIR data
│   ├── Crypto.service.ts         # Encryption/Decryption utilities
│   ├── EHR.service.ts            # Integration with EHR providers (Epic)
│   ├── Normalization.service.ts  # Standardizing raw FHIR data
│   ├── OAuth.service.ts          # Handling OAuth flows
│   ├── auth.service.ts           # User authentication logic
│   ├── email.service.ts          # Email sending functionality
│   ├── profile.service.ts        # User profile management
│   ├── sync.service.ts           # Background synchronization logic
│   └── syncStatus.service.ts     # Monitoring sync job statuses
│
├── sse/                  # Server-Sent Events for real-time updates
│   ├── sseBus.ts
│   └── sseSubscriber.ts
│
├── utils/                # Shared utilities and helpers
│   ├── email/
│   │   └── templates/
│   │       ├── passwordResetEmail.ts
│   │       └── verificationEmail.ts
│   └── validation/       # Zod schemas for input validation
│       ├── auth.schema.ts
│       └── profile.schema.ts
│
└── index.ts              # Entry point aggregating app modules
```

## Detailed Snapshot

*   **`controllers/`**: Contains the logic to handle incoming HTTP requests.
    *   `EHR.controller.ts`: Manages EHR connection requests and data retrieval.
    *   `OAuth.controller.ts`: Handles OAuth callbacks and redirects for Epic integration.
    *   `auth.controller.ts`: Manages user signup, login, and verification.
    *   `profile.controller.ts`: Handles fetching and updating user profiles and sync statuses.

*   **`middleware/`**: Interceptors for requests.
    *   `auth.middleware.ts`: Protects routes by verifying JWT tokens.
    *   `requestLogger.ts`: Logs incoming requests for debugging.

*   **`routes/`**: Defines the API endpoints.
    *   `EHR.routes.ts`: Routes for EHR operations.
    *   `OAuth.routes.ts`: Routes for OAuth callbacks.
    *   `auth.routes.ts`: Routes for authentication (signup, login).
    *   `profile.routes.ts`: Routes for profile data and sync checks.

*   **`services/`**: The core "brain" of the application.
    *   **Data Processing**: `Cleaning.service.ts`, `Normalization.service.ts`.
    *   **External Integrations**: `EHR.service.ts` (Epic), `email.service.ts` (Nodemailer), `OAuth.service.ts`.
    *   **Core Logic**: `auth.service.ts`, `profile.service.ts` (CRUD), `sync.service.ts` (jobs/queues), `syncStatus.service.ts`.
    *   **Security**: `Crypto.service.ts`.

*   **`sse/`**: Real-time communication.
    *   `sseBus.ts`: Event bus for broadcasting updates.
    *   `sseSubscriber.ts`: Handles client subscriptions to SSE streams.

*   **`utils/`**: Helper functions.
    *   **Email Templates**: predefined HTML/text for emails.
    *   **Validation**: Zod schemas to validate request bodies (`auth.schema.ts`, `profile.schema.ts`).

*   **`index.ts`**: The main file that likely exports the app router or initializes the application components.
