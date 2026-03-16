# ICoach — Developer's Architecture & Implementation Report

> **Document Type:** Technical Architecture & Onboarding Guide  
> **Target Audience:** New developers joining the ICoach team  
> **Repository:** [github.com/youssef-m-roushdy/ICoach](https://github.com/youssef-m-roushdy/ICoach)  
> **Last Analyzed:** 2026-03-01

---

## Table of Contents

1. [Executive Summary & Tech Stack](#1-executive-summary--tech-stack)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Detailed Directory & File Structure Analysis](#3-detailed-directory--file-structure-analysis)
4. [Core Logic Deep Dive](#4-core-logic-deep-dive)
5. [Extensibility Guide — How to Modify](#5-extensibility-guide--how-to-modify)
6. [Setup & Deployment Recommendations](#6-setup--deployment-recommendations)

---

## 1. Executive Summary & Tech Stack

### What Is ICoach?

ICoach is a **full-stack, AI-powered fitness and nutrition platform**. Its core value proposition is combining three distinct technology layers into a seamless user experience:

- A **cross-platform mobile app** (React Native / Expo) that serves as the primary user interface for workout tracking, meal logging, and progress monitoring.
- A **Node.js/Express REST API backend** that manages all persistent data, authentication, and business logic.
- A **Python/FastAPI AI microservice** that runs a trained deep-learning model (EfficientNetB0) for food image recognition and nutritional analysis.

Additionally, the mobile app itself houses **on-device ML models** (ONNX format) for real-time pose detection and exercise rep counting — meaning AI inference is split between the device (latency-sensitive tasks like pose tracking) and the server (heavier tasks like food classification).

The platform supports 270+ exercises, 100+ food classes (including Arabic cuisine), 7 UI languages, and OAuth sign-in through Google, Facebook, and GitHub.

---

### Core Technology Decisions

| Layer | Technology | Rationale |
|---|---|---|
| **Mobile Frontend** | React Native + Expo + TypeScript | Cross-platform iOS/Android/Web from a single codebase. Expo simplifies native build tooling, especially for camera and speech APIs. TypeScript enforces type safety across a complex domain model. |
| **State Management** | React Context API | Lightweight solution appropriate for this app's scope (auth state, theme). Avoids Redux overhead for a mobile-first app. |
| **Navigation** | React Navigation | Industry standard for React Native with native-feeling transitions, deep-linking, and nested navigator support. |
| **On-Device AI** | ONNX Runtime | Allows running ML models trained in any framework (PyTorch, TensorFlow) on-device via a unified runtime, enabling offline pose detection without server round-trips. |
| **Backend Runtime** | Node.js + Express + TypeScript | Non-blocking I/O suits a highly concurrent API serving many mobile clients simultaneously. TypeScript adds compile-time safety to the API contract. |
| **Primary Database** | PostgreSQL + Sequelize | Relational structure perfectly suits users, workouts, and their relationships (saved workouts, workout history). Sequelize provides ORM-level migrations and seeders for reproducible schema management. |
| **Secondary Database** | MongoDB + Mongoose | Schema-flexible document store used for activity logs, push notifications, and analytics — data that is write-heavy and schema-variable over time. |
| **AI Service** | Python + FastAPI + TensorFlow/Keras | Python is the de facto language for the ML ecosystem. FastAPI provides auto-generated OpenAPI docs and async support with minimal boilerplate. EfficientNetB0 offers a strong accuracy/compute trade-off for image classification. |
| **Image Storage** | Cloudinary | Managed image CDN eliminates the need to run a dedicated file server. Handles resizing, optimization, and delivery. |
| **Email** | Nodemailer | Flexible SMTP-based email library for verification and password-reset flows. |
| **Containerization** | Docker + Docker Compose | Ensures environment parity between development and production for both the backend and AI service. |
| **API Documentation** | Swagger/OpenAPI (backend) + FastAPI built-in docs (AI) | Auto-generated, interactive API documentation accessible at runtime. |

---

## 2. High-Level Architecture

### System Topology

The system is composed of **four runtime processes** that communicate over HTTP:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          📱 React Native Mobile App (Expo)               │  │
│  │  On-device ONNX models for pose detection (no network)   │  │
│  └──────────┬───────────────────────────┬────────────────────┘  │
└─────────────┼───────────────────────────┼──────────────────────-┘
              │ REST/JSON (HTTPS)          │ REST/JSON (HTTPS)
              ▼                           ▼
┌─────────────────────────┐   ┌────────────────────────────┐
│  🖥️ Node.js/Express API │   │  🤖 FastAPI AI Service     │
│  Port 3000              │   │  Port 8000                 │
│  - Auth (JWT + OAuth)   │   │  - Food image prediction   │
│  - Workout CRUD         │   │  - Nutrition lookup        │
│  - User/Profile CRUD    │   │  - EfficientNetB0 model    │
│  - Food data proxy      │   │                            │
│  - Cloudinary uploads   │   │                            │
└──────┬──────────────────┘   └──────────────┬─────────────┘
       │                                      │
  ┌────┴────────────────┐              ┌──────┴──────┐
  │  PostgreSQL (5432)  │              │  PostgreSQL  │
  │  MongoDB    (27017) │              │  (nutrition) │
  └─────────────────────┘              └─────────────┘
```

> **Key design insight:** The Node.js backend does **not** call the AI service for every request. Food recognition is triggered directly from the mobile app (user takes a photo → app sends to AI service → AI returns prediction → app may then log the result via the Node.js backend). This decouples AI latency from the main API's response time.

---

### End-to-End Data Flows

#### Flow 1: Food Recognition (Camera → AI Model → Nutrition Data)

```
1. User opens FoodsScreen → taps camera icon
2. MediaPickerSheet.tsx opens → user takes photo (Expo Camera API)
3. Image is base64-encoded or multipart-encoded on the device
4. POST /api/v1/food/predict → FastAPI AI Service (port 8000)
5. ml_service.py receives image → preprocesses to 224×224 pixels
6. EfficientNetB0 model runs inference → returns top class + confidence score
7. db_service.py looks up nutrition data for predicted food class in PostgreSQL
8. Response: { food_name, confidence, calories, protein, carbs, fat, ... }
9. App displays nutritional breakdown to the user
10. User confirms → app calls Node.js API to log the meal to user_meals table
```

#### Flow 2: Live Workout Mode (Pose Detection — Fully On-Device)

```
1. User opens LiveWorkoutScreen.tsx → selects exercise (e.g., Jumping Jacks)
2. Expo Camera streams video frames to poseDetection/ service on-device
3. Each frame is passed through the ONNX model (jumping_jacks.onnx)
4. aiFitnessEngine/ processes landmark coordinates → classifies rep phase
5. feedbackMapping.ts determines if form is correct
6. voiceFeedback.ts triggers Expo Speech API for audio cues
7. Rep counter increments → no network call required
8. On workout completion, results POST to Node.js /api/v1/user-workouts
```

#### Flow 3: Standard Authentication (Login → API Access)

```
1. User submits credentials → POST /api/v1/users/login
2. authController.ts validates password with bcrypt
3. Two JWTs generated: accessToken (15min TTL), refreshToken (7 days TTL)
4. refreshToken stored in refresh_tokens table (PostgreSQL)
5. Both tokens returned to AuthContext.tsx → stored in AsyncStorage
6. Subsequent API calls use Authorization: Bearer <accessToken>
7. On 401 response → AuthContext.refreshAccessToken() called
8. POST /api/v1/users/refresh-token → new token pair issued
9. Old refresh token rotated (invalidated), new pair stored
10. Original request retried transparently
```

---

## 3. Detailed Directory & File Structure Analysis

### Root-Level Layout

```
ICoach/
├── application/    → React Native mobile app (Expo)
├── server/         → Node.js + Express + TypeScript API
├── AI/             → Python FastAPI AI microservice
├── frontend/       → Web frontend (placeholder, not yet implemented)
├── .gitignore
├── LICENSE
└── README.md
```

---

### 3.1 `/application` — React Native Mobile App

```
application/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── CustomButton.tsx
│   │   │   ├── CustomInput.tsx
│   │   │   ├── GoogleButton.tsx
│   │   │   └── LanguageSelector.tsx
│   │   ├── auth/
│   │   │   └── AuthHeader.tsx
│   │   └── MediaPickerSheet.tsx
│   ├── screens/              (19 screens)
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── poseDetection/
│   │   └── aiFitnessEngine/
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   └── useForm.ts
│   ├── utils/
│   ├── constants/
│   │   ├── colors.ts
│   │   └── sizes.ts
│   ├── types/
│   └── styles/
├── ML_Models/
│   ├── jumping_jacks.onnx
│   └── jj_encoder_info.json
├── i18n/
│   ├── i18n.ts
│   └── locales/
│       ├── en.json, ar.json, fr.json
│       ├── de.json, es.json, it.json, is.json
└── assets/
```

#### Key Files & Their Roles

**`src/navigation/AppNavigator.tsx`**
The single source of routing truth. Defines the full navigation tree using React Navigation — typically a root Stack Navigator wrapping an Auth Stack (Welcome, SignIn, Signup, ForgotPassword, etc.) and a Main Tab/Stack Navigator (Home, Workouts, Foods, Profile, LiveWorkout). The navigator reads from `AuthContext` to decide which stack to render: if `isAuthenticated` is false, show Auth Stack; otherwise, show Main Stack. Deep-link handling for OAuth callbacks routes to `AuthCallbackScreen` from here.

**`src/context/AuthContext.tsx`**
The most critical file in the mobile app. It maintains the global auth state (`user`, `accessToken`, `refreshToken`, `isAuthenticated`). On mount, it reads stored tokens from `AsyncStorage` to restore session without re-login. It exposes `login()`, `logout()`, and crucially `refreshAccessToken()` — the method that intercepts 401 responses and obtains a new token pair. All token-to-storage operations are centralized here.

**`src/services/api.ts`**
An Axios (or Fetch) instance pre-configured with the Node.js API base URL. It includes request interceptors that automatically attach the `Authorization: Bearer <token>` header from `AuthContext`. The response interceptor catches 401 errors and calls `refreshAccessToken()` before retrying the original request — implementing the transparent token refresh pattern.

**`src/screens/LiveWorkoutScreen.tsx`**
Orchestrates the real-time workout experience. It opens the device camera, feeds frames into the pose detection pipeline, communicates with `aiFitnessEngine/`, displays a live rep counter and form score overlay, and calls `voiceFeedback.ts` for audio guidance. This is the most computationally intensive screen in the app.

**`src/services/aiFitnessEngine/`**
A modular AI engine composed of:
- `exercises/` — One file per exercise defining the joint angles and movement phases to detect (e.g., `jumpingJacks.ts` defines what "up" and "down" phases look like in terms of landmark positions).
- `feedbackMapping.ts` — Maps detected form errors (e.g., "arms not fully extended") to user-facing feedback strings.
- `voiceFeedback.ts` — Calls `expo-speech` to verbalize feedback during reps.
- `utils.ts` — Mathematical helpers for calculating joint angles from pose landmarks.

**`src/services/poseDetection/`**
Wraps the ONNX Runtime for React Native. Loads the `.onnx` model file from `ML_Models/`, pre-processes each camera frame (resize, normalize), runs inference, and returns a pose landmark object (x, y coordinates for each body keypoint).

**`src/screens/AuthCallbackScreen.tsx`**
Handles the deep-link redirect URI after OAuth (e.g., `icoach://auth/callback?token=...`). Extracts tokens from URL parameters and calls `AuthContext.login()`. This is the mobile-native OAuth conclusion screen.

**`i18n/i18n.ts`**
Initializes `i18next` with `react-i18next`. Loads locale JSON files and sets the language based on device locale or user preference (stored in `AsyncStorage`). All screen text is accessed via the `useTranslation()` hook.

**`ML_Models/jumping_jacks.onnx`**
The serialized neural network for jumping jack detection and rep counting. The accompanying `jj_encoder_info.json` stores model metadata: input tensor shape, output class labels, and normalization parameters needed by the inference wrapper.

---

### 3.2 `/server` — Node.js + Express Backend API

```
server/
├── src/
│   ├── app.ts                  ← Express app bootstrap
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── workoutController.ts
│   │   ├── foodController.ts
│   │   ├── savedWorkoutController.ts
│   │   └── viewController.ts
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── authRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   ├── workoutRoutes.ts
│   │   │   ├── foodRoutes.ts
│   │   │   └── savedWorkoutRoutes.ts
│   │   └── web/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   ├── config/
│   ├── migrations/
│   ├── seeders/
│   ├── types/
│   ├── utils/
│   └── views/
├── data/
│   ├── workouts_data.csv       ← 270+ exercise seed records
│   └── food_nutrition_data.json
├── config/
├── uploads/
└── logs/
```

#### Key Files & Their Roles

**`src/app.ts`**
The Express application bootstrap. Responsibilities include:
1. Initializing the Express app instance.
2. Mounting global middleware: `cors()`, `helmet()`, `morgan` (logging), `express.json()` body parser.
3. Connecting to PostgreSQL via Sequelize and MongoDB via Mongoose.
4. Initializing Passport.js with Google OAuth and JWT strategies.
5. Registering all routers under `/api/v1/`.
6. Mounting the Swagger UI at `/api-docs`.
7. Attaching the centralized error-handling middleware as the last middleware.
8. Exporting the configured app for the server entry point to call `.listen()`.

**`src/routes/v1/`**
Each file defines a router for its resource. Routes apply middleware in layers before reaching controllers — for example, `authMiddleware` (JWT verification) and `validationMiddleware` (Joi/Zod schema validation) are applied per-route. This keeps controllers clean of validation logic.

**`src/controllers/authController.ts`**
Handles the full authentication surface:
- `register` — Creates a new user record in PostgreSQL, hashes the password with bcrypt, generates a token pair, stores the refresh token, and sends a verification email via Nodemailer.
- `login` — Verifies credentials, generates new token pair, rotates refresh tokens.
- `logout` — Deletes the refresh token record from `refresh_tokens` table.
- `refreshToken` — Validates the incoming refresh token against the DB, issues a new pair (token rotation pattern), and invalidates the old refresh token.
- `forgotPassword` — Generates a time-limited reset token, stores its hash in the DB, and emails the reset link.
- `resetPassword` — Validates the reset token, updates the password hash, invalidates the token.
- `googleMobile` — Receives a Google `idToken` from the mobile app, verifies it with the Google Auth library, finds or creates the user record, and issues a JWT pair.

**`src/controllers/workoutController.ts`**
CRUD operations against the `workouts` PostgreSQL table. The `getAll` handler supports query-string filtering by `bodyPart`, `equipment`, and `level`, constructing Sequelize `where` clauses dynamically. `getFilters` returns all distinct values for filter dropdowns — a metadata endpoint consumed by the mobile app before rendering filter UI.

**`src/controllers/foodController.ts`**
Queries the food data stored in MongoDB (flexible schema). Supports full-text `search` via a text index on `name` and `category` fields. The food data was seeded from `food_nutrition_data.json`, which includes Arabic cuisine entries that complement the AI service's recognition capabilities.

**`src/controllers/savedWorkoutController.ts`**
Manages the many-to-many relationship between users and workouts. Creating a saved workout inserts a `(userId, workoutId)` record into `saved_workouts`. Deletion is by `workoutId` for the authenticated user. All endpoints require the JWT auth middleware.

**`src/middleware/`**
Expected to contain at minimum:
- **`authMiddleware.ts`** — Extracts and verifies the JWT from `Authorization` header using the secret from environment config. Attaches `req.user` for downstream controllers. Returns 401 on invalid/expired tokens.
- **`validationMiddleware.ts`** — Wraps schema validation (likely Joi or Zod). Returns 422 with structured error messages on schema violations.
- **`errorHandler.ts`** — Centralized Express error-handling middleware (4-argument signature). Catches all errors propagated via `next(err)`, maps them to HTTP status codes, and returns a consistent JSON error envelope.
- **`rateLimiter.ts`** — Express-rate-limit configuration to protect auth endpoints from brute-force attacks.

**`src/config/`**
Contains database connection configuration for both Sequelize (PostgreSQL) and Mongoose (MongoDB), reading connection strings from environment variables. The Sequelize config also exports the configuration for the Sequelize CLI used in migrations.

**`src/migrations/`**
Sequelize migration files defining the PostgreSQL schema in version-controlled, incremental steps. Each file exports `up` (apply) and `down` (rollback) functions. New developers should never manually alter the DB schema — always create a migration file.

**`src/seeders/`**
Sequelize seeder files for loading initial data. The `workouts_data.csv` (270+ exercises) and `food_nutrition_data.json` are read and bulk-inserted into the database here. Run with `npx sequelize-cli db:seed:all`.

**`data/workouts_data.csv`**
The canonical exercise library dataset. Each row contains: `name`, `bodyPart`, `equipment`, `gifUrl`, `target` muscle, `level`, and `instructions`. This is the source of truth for the workout library.

---

### 3.3 `/AI` — Python FastAPI AI Microservice

```
AI/
├── main.py                          ← FastAPI application entry point
├── AI_API_Features/
│   ├── routers/
│   │   └── food.py                  ← Food prediction route handlers
│   ├── services/
│   │   ├── ml_service.py            ← Model loading & inference logic
│   │   └── db_service.py            ← Nutrition DB lookups
│   ├── models/
│   │   ├── database.py              ← SQLAlchemy ORM models
│   │   └── schemas.py               ← Pydantic request/response schemas
│   ├── config/
│   │   ├── database.py              ← PostgreSQL connection (SQLAlchemy)
│   │   └── settings.py              ← Environment variable loading
│   └── utils/
│       └── helpers.py               ← Image preprocessing utilities
├── food_predict_feature/
│   ├── app.py                       ← Streamlit interactive demo
│   ├── best_model_food100.keras     ← Trained EfficientNetB0 weights
│   ├── class_names.json             ← 100+ food class label mapping
│   └── food detection model.ipynb  ← Model training notebook
├── requirements-api.txt
├── Dockerfile
└── docker-compose.yml
```

#### Key Files & Their Roles

**`main.py`**
The FastAPI application factory. It:
1. Creates the `FastAPI` app instance with metadata (title, version).
2. Loads environment settings via `settings.py`.
3. Establishes the PostgreSQL connection pool on startup using a `@app.on_event("startup")` handler.
4. Loads the Keras model into memory on startup (model is loaded once to avoid per-request latency).
5. Registers routers (e.g., `food.py` under `/api/v1/food`).
6. Exposes a `GET /health` endpoint for container health checks.

**`AI_API_Features/routers/food.py`**
Defines the food-related API endpoints:
- `POST /api/v1/food/predict` — Accepts a multipart image upload. Calls `ml_service.predict()` and then `db_service.get_nutrition()`. Returns a Pydantic-validated response.
- `GET /api/v1/food/classes` — Returns all 100+ recognizable food class names. Useful for the mobile app to display what the model can recognize.

**`AI_API_Features/services/ml_service.py`**
The inference engine. On application startup, the Keras model (`best_model_food100.keras`) is loaded into a module-level variable so it persists across requests. The `predict(image_bytes)` function:
1. Decodes the raw bytes into a PIL/OpenCV image.
2. Calls `helpers.preprocess_image()` to resize to 224×224 and normalize pixel values.
3. Expands dimensions to create a batch of 1.
4. Runs `model.predict()`.
5. Maps the output logits to class names via `class_names.json`.
6. Returns the top-1 prediction label and its confidence score.

**`AI_API_Features/services/db_service.py`**
Queries the PostgreSQL nutrition database using SQLAlchemy. Given a food class name returned by the model, it retrieves the full nutritional profile (calories, protein, carbohydrates, fat, fiber, etc.). If no exact match is found, it may apply fuzzy matching logic to find the closest record.

**`AI_API_Features/models/schemas.py`**
Pydantic models defining the API contract:
- `FoodPredictionResponse` — Contains `food_name`, `confidence`, `nutrition` (nested object).
- `NutritionInfo` — Contains `calories`, `protein`, `carbs`, `fat`, etc.
FastAPI uses these for automatic request validation and response serialization.

**`food_predict_feature/best_model_food100.keras`**
The trained model file. EfficientNetB0 was fine-tuned (transfer learning from ImageNet weights) on a dataset of 100+ food classes including Middle Eastern/Arabic dishes. Training details are in `food detection model.ipynb`.

**`food_predict_feature/app.py`**
A Streamlit web demo application. Allows developers and stakeholders to test the food recognition model interactively via a browser without deploying the full stack. Run with `streamlit run food_predict_feature/app.py`.

---

### 3.4 `/frontend` — Web Frontend (Placeholder)

This directory currently contains only a `README.md`. It is reserved for a planned web frontend application. Based on the tech stack patterns in the project, this will likely be a React or Next.js application. New developers should not add production code here until the architecture is defined.

---

## 4. Core Logic Deep Dive

### 4.1 Authentication System

ICoach implements a **dual-token, rotating refresh token** authentication system — a security best practice that balances UX convenience with security.

#### JWT Token Architecture

| Token | TTL | Storage | Purpose |
|---|---|---|---|
| `accessToken` | 15 minutes | AsyncStorage (mobile) | Authorizes API requests in `Authorization` header |
| `refreshToken` | 7 days | AsyncStorage (mobile) + PostgreSQL `refresh_tokens` table | Obtains a new access token without re-login |

The short access token TTL limits the exposure window if a token is intercepted. The refresh token stored server-side allows the server to **invalidate sessions** by deleting the DB record (e.g., on logout, suspicious activity, or password change).

#### Token Rotation Pattern

When `refreshToken` is used, the server:
1. Validates the incoming refresh token against the `refresh_tokens` table.
2. Deletes the used refresh token record (**one-time use**).
3. Issues a brand new `(accessToken, refreshToken)` pair.
4. Stores the new refresh token in the DB.
5. Returns both new tokens to the client.

This means a stolen refresh token can only be used once before it's invalidated by the legitimate user's next refresh cycle.

#### Google OAuth (Mobile Native Flow)

The mobile OAuth flow differs from a traditional web OAuth redirect:

1. The mobile app uses `expo-auth-session` or the native Google Sign-In SDK to obtain a Google **`idToken`** on-device.
2. The `idToken` is sent to `POST /api/v1/auth/google/mobile`.
3. The backend uses the `google-auth-library` (Node.js) to verify the `idToken` with Google's public keys.
4. On successful verification, the backend extracts the user's Google profile (email, name, avatar).
5. It either finds the existing user (`WHERE email = ?`) or creates a new one (upsert pattern).
6. The same `(accessToken, refreshToken)` pair is issued as with email/password login.

This design means the backend never handles the OAuth redirect flow — it only validates cryptographically signed tokens, which is safer and works without a browser redirect on mobile.

#### Password Reset Flow

```
ForgotPasswordScreen → POST /forgot-password
  → Server generates crypto.randomBytes(32) reset token
  → Stores SHA-256 hash of token in users table (resetPasswordToken, resetPasswordExpires)
  → Emails plain token to user as a link: https://app/reset-password?token=<plain>
  → User clicks link → ResetPasswordScreen
  → POST /reset-password { token, newPassword }
  → Server hashes the incoming token, compares to stored hash
  → Validates expiry (typically 1 hour)
  → Updates password hash, clears reset token fields
```

Storing only the hash of the reset token means a database breach cannot be used to reset arbitrary passwords.

---

### 4.2 AI Integration

#### Server-Side AI (Food Recognition)

The food recognition pipeline is a classic **inference-as-a-service** pattern:

```
Mobile App
  → (JPEG bytes, multipart/form-data)
  → POST /api/v1/food/predict  [FastAPI, port 8000]
  → ml_service.preprocess_image()
      - Decode bytes → PIL Image
      - Resize to (224, 224)
      - Normalize: pixel values / 255.0 or ImageNet mean/std normalization
      - Expand dims: (1, 224, 224, 3)
  → model.predict(tensor)
      - EfficientNetB0 forward pass
      - Softmax output: probability for each of 101 classes
  → argmax → class index → class_names.json lookup
  → confidence = max probability
  → db_service.get_nutrition(class_name)
      - SELECT * FROM foods WHERE name ILIKE '%{class_name}%' LIMIT 1
  → Return FoodPredictionResponse JSON
```

**Why EfficientNetB0?** EfficientNet models achieve state-of-the-art accuracy with significantly fewer parameters than ResNet or VGG architectures, making them ideal for serving at scale. The `B0` variant is the smallest/fastest in the EfficientNet family — appropriate for a real-time API where many users may submit images simultaneously.

#### On-Device AI (Pose Detection & Rep Counting)

This is architecturally different — the model runs **entirely on the user's device**:

```
Device Camera Frame (raw)
  → poseDetection/ service
      - Load jumping_jacks.onnx via ONNX Runtime for React Native
      - Preprocess frame: resize, normalize
      - Infer: output = 17 landmark points (x, y, confidence)
  → aiFitnessEngine/exercises/jumpingJacks.ts
      - Calculate joint angles (shoulder, hip, knee, elbow) from landmarks
      - Classify phase: IDLE | UP | DOWN
      - Detect rep transition: DOWN → UP = +1 rep
  → feedbackMapping.ts
      - Check form rules (e.g., arms must be above shoulder level in UP phase)
      - Map violations → feedback strings
  → voiceFeedback.ts
      - expo-speech.speak(feedbackString)
  → Update LiveWorkoutScreen UI: rep count, form score, overlay skeleton
```

**Why ONNX on-device?** Running pose detection server-side would require streaming video frames over the network — adding ~100-300ms latency per frame, which destroys the real-time experience. ONNX Runtime for React Native allows the same model to run at 15-30 FPS on modern smartphones.

---

### 4.3 Database Schema

ICoach uses a **polyglot persistence** strategy: PostgreSQL for relational, transactional data, and MongoDB for flexible, analytics-style data.

#### PostgreSQL — Relational Schema

```
┌──────────────┐         ┌──────────────────┐
│    users     │         │  refresh_tokens  │
│──────────────│         │──────────────────│
│ id (PK)      │◄────────│ userId (FK)      │
│ email        │         │ token (hashed)   │
│ passwordHash │         │ expiresAt        │
│ name         │         │ createdAt        │
│ avatar       │         └──────────────────┘
│ googleId     │
│ height       │         ┌──────────────────┐
│ weight       │         │ resetPwdToken    │
│ bmi          │         │ resetPwdExpires  │
│ goal         │         └──────────────────┘
│ activityLevel│              (in users table)
│ isVerified   │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────┐        ┌───────────────┐
│  saved_workouts  │        │   workouts    │
│──────────────────│        │───────────────│
│ id (PK)          │        │ id (PK)       │
│ userId (FK)      │───────►│ name          │
│ workoutId (FK)   │        │ bodyPart      │
│ createdAt        │        │ equipment     │
└──────────────────┘        │ gifUrl        │
                            │ target        │
┌──────────────────┐        │ level         │
│  user_workouts   │        │ instructions  │
│──────────────────│        └───────────────┘
│ id (PK)          │
│ userId (FK)      │
│ workoutId (FK)   │        ┌───────────────┐
│ reps             │        │     foods     │
│ sets             │        │───────────────│
│ duration         │        │ id (PK)       │
│ completedAt      │        │ name          │
└──────────────────┘        │ calories      │
                            │ protein       │
                            │ carbs         │
                            │ fat           │
                            │ category      │
                            └───────────────┘
```

> **Note on `foods` table location:** The `foods` table exists in **both** PostgreSQL (for the AI service's nutrition lookups) and potentially MongoDB (for the Node.js API's food search). The canonical nutrition data source for the AI service is the PostgreSQL instance managed by the AI service. The Node.js API may use MongoDB for its richer food catalog with text search.

#### MongoDB — Document Collections

```javascript
// activity_logs collection
{
  _id: ObjectId,
  userId: String,          // references PostgreSQL users.id
  action: String,          // e.g., "WORKOUT_COMPLETED", "MEAL_LOGGED"
  metadata: Object,        // flexible schema per action type
  timestamp: Date
}

// notifications collection
{
  _id: ObjectId,
  userId: String,
  title: String,
  body: String,
  isRead: Boolean,
  type: String,            // "ACHIEVEMENT", "REMINDER", "SYSTEM"
  createdAt: Date
}

// analytics collection
{
  _id: ObjectId,
  userId: String,
  event: String,
  properties: Object,      // arbitrary event properties
  sessionId: String,
  platform: String,        // "ios" | "android" | "web"
  timestamp: Date
}
```

MongoDB is used here for its schema flexibility — activity events and analytics have wildly different `metadata` shapes depending on the action type, making a rigid relational schema impractical.

---

## 5. Extensibility Guide — How to Modify

### 5.1 Adding a New Exercise to the Library

**Scenario:** You want to add "Burpees" to the workout catalog.

**Step 1 — Add data:**
Add a new row to `server/data/workouts_data.csv` with all required fields (`name`, `bodyPart`, `equipment`, `gifUrl`, `target`, `level`, `instructions`).

**Step 2 — Re-seed the database:**
```bash
cd server
npx sequelize-cli db:seed --seed <workout-seeder-filename>
```
Or if the seeder reads the CSV file dynamically, simply re-run `db:seed:all` (ensure idempotent seeders with `INSERT ... ON CONFLICT DO NOTHING`).

**Step 3 — Verify via API:**
```bash
GET /api/v1/workouts?bodyPart=full+body
```
Confirm "Burpees" appears in the response. No code changes needed for the backend or mobile app — the workout library is purely data-driven.

**Step 4 (Optional) — Add on-device AI support for live tracking:**
If you want live rep counting for Burpees, this is a substantial engineering task:
1. Collect and label training data (video of burpees with pose annotations).
2. Train or fine-tune a classification model.
3. Export to ONNX format.
4. Place the `.onnx` file in `application/ML_Models/`.
5. Create `application/src/services/aiFitnessEngine/exercises/burpees.ts` defining the phase detection logic (STANDING → SQUAT → PLANK → PUSH-UP → JUMP).
6. Register the new exercise in `feedbackMapping.ts` with its form rules.
7. Update `LiveWorkoutScreen.tsx` to load the correct model based on the selected exercise.

---

### 5.2 Adding a New AI Model to the AI Service

**Scenario:** You've trained a new model that classifies workout equipment from an image.

**Step 1 — Place the model file:**
Add the Keras/ONNX/TFLite model to `AI/food_predict_feature/` (or create a new feature folder, e.g., `AI/equipment_detect_feature/`) alongside a `class_names_equipment.json`.

**Step 2 — Create a new service:**
```python
# AI/AI_API_Features/services/equipment_ml_service.py
import tensorflow as tf
import json

model = None
class_names = []

def load_model():
    global model, class_names
    model = tf.keras.models.load_model("equipment_detect_feature/best_model_equipment.keras")
    with open("equipment_detect_feature/class_names_equipment.json") as f:
        class_names = json.load(f)

def predict(image_bytes: bytes) -> dict:
    # preprocess → infer → return result
    ...
```

**Step 3 — Create a new router:**
```python
# AI/AI_API_Features/routers/equipment.py
from fastapi import APIRouter, UploadFile, File
from ..services.equipment_ml_service import predict

router = APIRouter(prefix="/api/v1/equipment", tags=["Equipment"])

@router.post("/predict")
async def predict_equipment(file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = predict(image_bytes)
    return result
```

**Step 4 — Register in `main.py`:**
```python
from AI_API_Features.routers import equipment
app.include_router(equipment.router)
```

**Step 5 — Register model loading on startup:**
```python
from AI_API_Features.services import equipment_ml_service

@app.on_event("startup")
async def startup_event():
    ml_service.load_model()
    equipment_ml_service.load_model()  # ← add this
```

**Step 6 — Add Pydantic schemas** in `schemas.py` for the new endpoint's request/response contract.

**Step 7 — Call from Node.js or mobile:** The Node.js backend can proxy to the new AI endpoint, or the mobile app can call it directly (similar to the food recognition pattern).

---

### 5.3 Adding a New API Endpoint to the Node.js Backend

**Checklist for adding, e.g., `POST /api/v1/user-meals` (log a meal):**

- [ ] **Define the Sequelize model** in `server/src/models/UserMeal.ts` (if the table doesn't exist).
- [ ] **Create a migration** to add the `user_meals` table: `npx sequelize-cli migration:generate --name create-user-meals`. Implement `up` and `down` functions.
- [ ] **Run the migration:** `npx sequelize-cli db:migrate`.
- [ ] **Write the controller** in `server/src/controllers/mealController.ts`. Export an `async (req, res, next) => {}` handler. Use `try/catch` and forward errors to `next(err)`.
- [ ] **Define the route** in `server/src/routes/v1/mealRoutes.ts`. Apply `authMiddleware` and any validation middleware.
- [ ] **Register the router** in `server/src/app.ts`: `app.use('/api/v1/meals', mealRouter)`.
- [ ] **Add TypeScript types** to `server/src/types/` if new request/response shapes are introduced.
- [ ] **Document with JSDoc/Swagger annotations** on the route or controller so the `/api-docs` page reflects the new endpoint.
- [ ] **Write a test** (if test infrastructure exists under `server/__tests__/`).
- [ ] **Update `api.ts` in the mobile app** with a new function that calls the endpoint.

---

### 5.4 Adding a New Language

1. Create `application/i18n/locales/<language-code>.json` (e.g., `pt.json` for Portuguese). Copy `en.json` as a template and translate all string values.
2. Register the new locale in `application/i18n/i18n.ts` — add it to the `resources` object passed to `i18next.init()`.
3. Add the language option to `LanguageSelector.tsx` in the component's options array.
4. Test the layout — RTL languages (Arabic) may require `I18nManager.forceRTL(true)` logic that should already exist; verify it works for the new language if it's RTL.

---

## 6. Setup & Deployment Recommendations

### 6.1 Environment Variable Configuration

Each service requires its own `.env` file. Below is the complete reference for each.

#### `server/.env`

```bash
# Server
NODE_ENV=development
PORT=3000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=icoach_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/icoach_logs

# JWT
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

#### `AI/.env`

```bash
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/icoach_ai_db

# Model paths
MODEL_PATH=food_predict_feature/best_model_food100.keras
CLASS_NAMES_PATH=food_predict_feature/class_names.json

# App
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

#### `application/.env`

```bash
# API Endpoints
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:8000/api/v1

# OAuth (must match server configuration)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Deep Linking
EXPO_PUBLIC_APP_SCHEME=icoach
```

> ⚠️ **Security note:** Never commit `.env` files. The repository's `.gitignore` should already exclude them. Use `.env.example` files (with placeholder values) as templates.

---

### 6.2 Docker Compose Configuration

#### Backend (`server/docker-compose.yml`)

The backend Docker Compose file orchestrates three containers:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      # ... other env vars from .env
    depends_on:
      - postgres
      - mongo

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: icoach_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

  pgadmin:           # Optional: DB management UI at port 5050
    image: dpage/pgadmin4
    ...

volumes:
  postgres_data:
  mongo_data:
```

#### AI Service (`AI/docker-compose.yml`)

```yaml
version: '3.8'
services:
  ai-service:
    build: .
    ports: ["8000:8000"]
    volumes:
      - ./food_predict_feature:/app/food_predict_feature  # mount model files
    environment:
      DATABASE_URL: postgresql://postgres:password@ai-db:5432/icoach_ai_db

  ai-db:
    image: postgres:15-alpine
    volumes:
      - ai_postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: icoach_ai_db

volumes:
  ai_postgres_data:
```

---

### 6.3 First-Time Setup Sequence (Manual)

Follow this exact order to avoid dependency issues:

```bash
# 1. Start databases
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
mongod --dbpath /data/db &

# 2. Setup & start backend
cd server
npm install
cp .env.example .env             # edit with your credentials
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all    # loads 270+ exercises and food data
npm run dev                      # starts on http://localhost:3000
# Verify: http://localhost:3000/api-docs

# 3. Setup & start AI service
cd ../AI
python -m venv venv
source venv/bin/activate
pip install -r requirements-api.txt
cp .env.example .env             # edit with DB credentials
# The model file (best_model_food100.keras) must exist in food_predict_feature/
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Verify: http://localhost:8000/docs

# 4. Setup & start mobile app
cd ../application
npm install
cp .env.example .env             # set API URLs to localhost
npm start                        # starts Expo dev server
# Scan QR with Expo Go or press 'a' for Android emulator
```

---

### 6.4 Production Deployment Considerations

**Reverse Proxy:** Place Nginx or a cloud load balancer in front of both services. Route `/api/v1/food/predict` and `/api/v1/food/classes` to port 8000 (AI), everything else to port 3000 (Node.js API). This gives the mobile app a single base URL.

**Model File in Docker:** The `best_model_food100.keras` file is large (EfficientNetB0 weights ~20MB). Ensure it is included in the Docker image build context or mounted as a volume from persistent storage.

**Database Migrations in CI/CD:** Run `npx sequelize-cli db:migrate` as a step in your deployment pipeline before starting the new server container. Never run migrations manually in production.

**Environment Variables in Production:** Use your cloud provider's secrets manager (AWS Secrets Manager, GCP Secret Manager, or Docker secrets) rather than plain `.env` files on production hosts.

**Cloudinary Webhook:** For avatar uploads, Cloudinary may need a webhook URL back to your server for async processing callbacks. Ensure your production domain is configured in the Cloudinary dashboard.

**Mobile App API URLs:** The `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_AI_SERVICE_URL` in `application/.env` must point to the production server's public HTTPS URLs before building the production app bundle. The app binary bakes in these URLs at build time (Expo's `EXPO_PUBLIC_*` mechanism).

---

## Appendix: Quick-Reference Cheat Sheet

| Task | Command / Location |
|---|---|
| Add a new workout to the library | Edit `server/data/workouts_data.csv`, re-seed |
| Add a new API endpoint | `controllers/` → `routes/v1/` → `app.ts` registration |
| Add a new AI model | `AI/AI_API_Features/services/` + `routers/` + `main.py` |
| Add a new language | `application/i18n/locales/<code>.json` + register in `i18n.ts` |
| View backend API docs | `http://localhost:3000/api-docs` |
| View AI service docs | `http://localhost:8000/docs` |
| Run DB migration | `npx sequelize-cli db:migrate` (in `server/`) |
| Roll back migration | `npx sequelize-cli db:migrate:undo` |
| Test food recognition model | `streamlit run AI/food_predict_feature/app.py` |
| Build Android APK | `cd application && npm run build:android` |
| Start all services (Docker) | `docker-compose up --build` (in `server/` and `AI/` separately) |

---

*Report generated via automated codebase analysis. For questions, refer to the repository README or contact the project author [@youssef-m-roushdy](https://github.com/youssef-m-roushdy).*
