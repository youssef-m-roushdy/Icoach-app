# ICoach Developer's Architecture & Implementation Report

**Document Version:** 1.0  
**Date:** March 2026  
**Audience:** Development Team - New and Existing Developers  
**Project:** ICoach - AI-Powered Fitness & Nutrition Platform

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Detailed Directory & File Structure](#detailed-directory--file-structure)
5. [Core Logic Deep Dive](#core-logic-deep-dive)
6. [Extensibility Guide](#extensibility-guide)
7. [Setup & Deployment](#setup--deployment)

---

## Executive Summary

### What is ICoach?

**ICoach** is a comprehensive, full-stack AI-powered fitness and nutrition platform that empowers users to track their workouts, monitor nutrition, and achieve fitness goals through intelligent computer vision and real-time guidance. The platform combines:

- **Mobile Application** (iOS/Android/Web via React Native/Expo)
- **Backend REST API** (Node.js + TypeScript with dual-database support)
- **AI Service** (Python FastAPI with machine learning models)
- **Real-time Communication** (Socket.IO for live updates)
- **Container Orchestration** (Docker & Docker Compose)

### Core Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Food Recognition** | EfficientNetB0 model identifies 100+ food items from photos and retrieves nutritional data |
| 💪 **Workout Library** | 270+ exercises with GIFs, filterable by body part, equipment, and difficulty level |
| 🏃 **Live Pose Detection** | On-device ONNX models for real-time exercise form analysis and rep counting |
| 🔐 **OAuth Integration** | Google Sign-In, Facebook, and GitHub authentication with JWT token management |
| 📊 **Nutrition Tracking** | AI-powered calorie counting and macro tracking with serving size calculation |
| 🌍 **Multi-language** | Support for 7 languages (English, Arabic, French, German, Spanish, Italian, Icelandic) |
| 🎤 **Voice Guidance** | Real-time audio feedback during workouts using text-to-speech |
| 📱 **Offline Support** | AsyncStorage for local data persistence and offline workout logging |

---

## Technology Stack

### Frontend (Mobile Application)
| Technology | Purpose | Version |
|------------|---------|---------|
| **React Native** | Cross-platform mobile framework | 0.81.5 |
| **Expo** | Development platform and CLI | ~54.0.18 |
| **TypeScript** | Static type checking for JavaScript | 5.9.3 |
| **React Navigation** | Native navigation library | 7.x |
| **Redux/Context API** | State management (using Context) | React 19.1.0 |
| **Socket.IO Client** | Real-time WebSocket communication | 4.8.3 |
| **ONNX Runtime RN** | On-device ML inference for pose detection | 1.23.2 |
| **React Native Mediapipe** | ML model inference (pose detection) | 0.6.0 |
| **Expo Camera** | Camera access for image/video capture | ~17.0.10 |
| **Expo Auth Session** | OAuth flow handling | ~7.0.8 |
| **i18next** | Internationalization framework | 25.6.0 |

**Why this stack?**
- React Native ensures code reuse across iOS/Android with native performance
- Expo provides managed development environment with OTA updates
- ONNX Runtime enables on-device ML without network dependency
- Socket.IO enables real-time email verification and live notifications

### Backend (Server)
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | JavaScript runtime (TypeScript via tsx/tsc) | Latest LTS |
| **Express** | Minimalist web framework | Latest |
| **TypeScript** | Type-safe backend development | 5.9.3 |
| **PostgreSQL** | Relational database (primary) | 16-alpine |
| **Sequelize ORM** | Object-Relational Mapper for PostgreSQL | Latest |
| **MongoDB** | NoSQL database (logging & AI data) | 7-jammy |
| **Mongoose** | MongoDB ODM | Latest |
| **Passport.js** | Authentication middleware | Latest |
| **JWT** | Bearer token authentication | jsonwebtoken 9.0.10 |
| **Socket.IO** | Real-time bidirectional communication | 4.x |
| **Nodemailer** | Email service for verification | 7.0.2 |
| **Cloudinary** | Cloud storage for avatar images | Configured via env |
| **Docker** | Containerization | Latest |
| **Redis** | Session store & cache (optional) | 7-alpine |

**Why this stack?**
- Node.js with Express enables scalable REST APIs with high concurrency
- PostgreSQL for structured relational data (users, workouts, food)
- MongoDB for flexible logging and AI prediction history
- Sequelize provides type-safe ORM with migrations support
- Passport.js + JWT enables secure multi-provider authentication
- Socket.IO enables real-time features (email verification notifications)
- Docker ensures consistent development and production environments

### AI Service
| Technology | Purpose | Version |
|------------|---------|---------|
| **Python** | Primary language for ML | 3.9+ |
| **FastAPI** | Modern async Python web framework | >=0.109.0 |
| **TensorFlow/Keras** | Deep learning framework | >=2.16.0 |
| **EfficientNetB0** | Pre-trained CNN for food classification | N/A |
| **SQLAlchemy** | SQL toolkit and ORM for Python | >=2.0.25 |
| **Pydantic** | Data validation framework | >=2.5.0 |
| **Streamlit** | Interactive web demo interface | >=1.31.0 |
| **PostgreSQL** | Nutrition data storage | 16-alpine |
| **Uvicorn** | ASGI server | >=0.27.0 |
| **Docker** | Containerization for ML service | Latest |

**Why this stack?**
- FastAPI provides high-performance async API with automatic OpenAPI documentation
- TensorFlow/Keras enables production ML model deployment with GPU support
- EfficientNetB0 offers excellent accuracy-to-inference-time tradeoff
- SQLAlchemy abstracts database complexity
- Pydantic ensures type-safe API request/response validation
- Streamlit provides quick interactive demo without React/HTML knowledge

### DevOps & Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker** | Container runtime for all services |
| **Docker Compose** | Multi-container orchestration (dev & prod) |
| **PostgreSQL Volumes** | Persistent database storage |
| **MongoDB Volumes** | Persistent NoSQL storage |
| **Redis Volumes** | Persistent session/cache storage |
| **Health Checks** | Automated service recovery |

---

## High-Level Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ICoach Ecosystem                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│    MOBILE APP (React Native)     │
│  ├─ iOS / Android / Web           │
│  ├─ Expo CLI for development      │
│  ├─ On-device ML (ONNX, Mediapipe)│
│  └─ Real-time features via WS     │
└────────────┬─────────────────────┘
             │
             │ REST API + WebSocket
             │ (JWT Bearer Token Auth)
             │
   ┌─────────▼──────────┐
   │  API GATEWAY       │
   │  (Node.js/Express) │
   │  ├─ /api/v1/*      │
   │  ├─ Swagger Docs   │
   │  └─ Socket.IO      │
   └────┬────────┬──────┘
        │        │
        │ SQL    │ NoSQL
        │        │
   ┌────▼──┐  ┌──▼────────┐
   │  PG   │  │ MongoDB    │
   │ /5432 │  │  /27017    │
   └───────┘  └────────────┘
        │
        │ Internal API Call
        │
   ┌────▼────────────────────┐
   │   AI SERVICE (Python)    │
   │  ├─ FastAPI /api/food/*  │
   │  ├─ ML Models (Keras)    │
   │  └─ /docs & /redoc       │
   └──────────────────────────┘
```

### Data Flow: Image Upload → Prediction → Database

```
Mobile App (User)
    ↓
[Camera Capture / Gallery Select]
    ↓
REST: POST /api/v1/foods/recognize
    ↓
[Backend receives image binary]
    ↓
Forward to AI Service
    ↓
POST /api/food/predict
    ↓
[AI loads EfficientNetB0 model]
    ↓
[Preprocesses image: resize, normalize]
    ↓
[Passes through neural network]
    ↓
[Returns top-N predictions with confidence scores]
    ↓
[Backend queries PostgreSQL for food metadata]
    ↓
SELECT * FROM foods WHERE name = predicted_food
    ↓
[Retrieves nutritional data: calories, macros, etc.]
    ↓
[Backend caches result in MongoDB for analytics]
    ↓
[Returns JSON with food_data + nutritional_info]
    ↓
Mobile App displays results to user
```

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Authentication & Token Management                │
└──────────────────────────────────────────────────────────────┘

REGULAR AUTHENTICATION:
  User Input (email/password)
    ↓
  Backend: POST /api/v1/auth/login
    ↓
  [Hash comparison with bcrypt]
    ↓
  [Generate JWT (15min) + Refresh Token (7d)]
    ↓
  Return: {user, accessToken, refreshToken}
    ↓
  Mobile: Store accessToken in RAM, refreshToken in AsyncStorage
    ↓
  Authenticated Requests: Authorization: Bearer <accessToken>


OAUTH AUTHENTICATION (Google):
  Mobile: Trigger expo-auth-session
    ↓
  [User confirms Google Sign-In]
    ↓
  Mobile: Receive ID token
    ↓
  Mobile: POST /api/v1/auth/google {idToken}
    ↓
  Backend: Verify token with Google
    ↓
  Backend: Check if user exists by email
    ↓
    ├─ YES → Update lastLogin, return user + tokens
    └─ NO  → Create new user from Google profile
    ↓
  Return: {user, accessToken, refreshToken}
    ↓
  Mobile: Trigger email verification via Socket.IO


TOKEN REFRESH:
  Mobile: accessToken expires
    ↓
  [Triggered by 401 Unauthorized]
    ↓
  Mobile: POST /api/v1/auth/refresh
         {refreshToken from AsyncStorage}
    ↓
  Backend: Verify refreshToken
    ↓
  [Generate new accessToken + refreshToken]
    ↓
  Mobile: Update tokens, retry original request


REAL-TIME EMAIL VERIFICATION:
  User: Click verification link in email
    ↓
  Backend: Update user.isEmailVerified = true
    ↓
  Backend: Emit event via Socket.IO to user ID
    ↓
  Mobile: AuthContext receives "emailVerified" event
    ↓
  Mobile: Update user state + show success alert
```

### Service Communication

```
┌─────────────────────────────────────────────────────────┐
│        Inter-Service Communication Patterns             │
└─────────────────────────────────────────────────────────┘

REQUEST-RESPONSE (HTTP):
┌──────────────┐                      ┌──────────────┐
│  Mobile App  │──── HTTP REST ──────>│   Backend    │
│              │<─ JSON Response ──────│              │
└──────────────┘                      └──────────────┘

┌──────────────┐                      ┌──────────────┐
│   Backend    │──── Form-Data ──────>│  AI Service  │
│              │<─ JSON (predictions)─ │  (FastAPI)   │
└──────────────┘                      └──────────────┘

REAL-TIME (WebSocket):
┌──────────────┐                      ┌──────────────┐
│  Mobile App  │<════ Socket.IO ═════>│   Backend    │
│ (Listen)     │  (Emit/On Events)    │  (Socket.IO) │
└──────────────┘                      └──────────────┘

DATABASE (Synchronous):
┌──────────────┐                      ┌──────────────┐
│   Backend    │◄──── SQL/Mongoose ──►│ PostgreSQL   │
│              │                      │ + MongoDB    │
└──────────────┘                      └──────────────┘
```

---

## Detailed Directory & File Structure

### Root Project Structure

```
icoach-app/
├── application/          # React Native Mobile App (Expo)
├── server/               # Node.js Express Backend (TypeScript)
├── AI/                   # Python FastAPI AI Service
├── README.md             # Project overview
└── LICENSE               # License file
```

---

### `/application` - React Native Mobile App

**Purpose:** Cross-platform mobile application (iOS, Android, Web) for users to access fitness features, track workouts, and use AI food recognition.

```
application/
├── package.json          # Dependencies (Expo, React Native, ML libs)
├── App.tsx              # Root component wrapper
├── index.ts             # Entry point
├── tsconfig.json        # TypeScript configuration
├── app.json             # Expo app configuration (name, icon, splash)
├── babel.config.js      # Babel configuration
└── src/
    ├── components/
    │   ├── auth/                 # Authentication UI components
    │   │   ├── LoginForm.tsx
    │   │   ├── RegisterForm.tsx
    │   │   └── OAuthButton.tsx
    │   ├── common/               # Reusable UI components
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Card.tsx
    │   │   └── LoadingSpinner.tsx
    │   └── MediaPickerSheet.tsx  # Image picker for food recognition
    │
    ├── screens/                  # Screen components (full pages)
    │   ├── AuthCallbackScreen.tsx    # OAuth redirect handler
    │   ├── ChangePasswordScreen.tsx  # Password reset UI
    │   ├── EditBodyInfoScreen.tsx    # Body metrics input
    │   ├── EditProfileScreen.tsx     # Profile editor
    │   ├── LoginScreen.tsx           # Sign-in page
    │   ├── RegisterScreen.tsx        # Sign-up page
    │   ├── HomeScreen.tsx            # Dashboard/home page
    │   ├── WorkoutsScreen.tsx        # Browse & filter workouts
    │   ├── LiveWorkoutScreen.tsx     # Real-time pose detection
    │   ├── FoodRecognitionScreen.tsx # AI food scanner
    │   ├── ProgressScreen.tsx        # Statistics & progress tracking
    │   └── ProfileScreen.tsx         # User profile view
    │
    ├── navigation/
    │   └── AppNavigator.tsx      # React Navigation stack & routing
    │
    ├── context/                  # Global state management
    │   ├── AuthContext.tsx       # Authentication state & login/logout
    │   ├── ThemeContext.tsx      # Light/Dark theme
    │   └── index.ts              # Context exports
    │
    ├── services/
    │   ├── api.ts                # REST API wrapper with auto-refresh
    │   ├── socketService.ts      # WebSocket (Socket.IO) client
    │   ├── aiFitnessEngine/      # On-device ML for exercises
    │   │   ├── PoseDetection.ts
    │   │   └── ExerciseCounter.ts
    │   └── poseDetection/        # Mediapipe wrapper
    │       └── PoseDetector.ts
    │
    ├── hooks/
    │   ├── useForm.ts            # Form validation hook
    │   ├── useAuth.ts            # Auth context hook
    │   └── index.ts              # Hooks exports
    │
    ├── constants/
    │   ├── colors.ts             # Color palette
    │   ├── sizes.ts              # Dimension constants
    │   └── index.ts              # Constants exports
    │
    ├── types/
    │   ├── navigation.ts         # React Navigation type definitions
    │   ├── api.ts                # API request/response types
    │   ├── auth.ts               # Authentication types
    │   └── index.ts              # Types exports
    │
    ├── utils/
    │   ├── helpers.ts            # Utility functions
    │   ├── validators.ts         # Input validation logic
    │   └── formatters.ts         # Data formatting
    │
    ├── styles/
    │   ├── colors.ts             # Shared color values
    │   ├── spacing.ts            # Margin/padding scale
    │   └── typography.ts         # Font sizes & weights
    │
    └── i18n/
        ├── i18n.ts               # i18next configuration
        └── locales/
            ├── en.json           # English translations
            ├── ar.json           # Arabic translations
            ├── fr.json           # French translations
            ├── de.json           # German translations
            ├── es.json           # Spanish translations
            ├── it.json           # Italian translations
            └── is.json           # Icelandic translations
```

#### Key Application Files

**`App.tsx` - Root Component Wrapper**
- Wraps entire app with providers (AuthProvider, ThemeProvider)
- Sets up React Navigation
- Initializes i18n (internationalization)

**`src/context/AuthContext.tsx` - Authentication State**
- Manages global `user`, `token`, `isAuthenticated`, `isLoading` state
- Handles login/logout flows
- Implements token refresh with automatic retry
- Emits Socket.IO listeners for email verification events
- Persists tokens to AsyncStorage

**`src/services/api.ts` - Backend Communication**
- Exports `API_BASE_URL` pointing to backend (configurable via env)
- Implements `apiCallWithRefresh()` for automatic token refresh on 401
- Provides typed methods:
  - `authService.login(credentials)`
  - `authService.registerUser(data)`
  - `authService.googleOAuth(idToken)`
  - `foodService.recognizeFood(image)`
  - `workoutService.getWorkouts(filters)`
  - `workoutService.saveWorkout(workoutId)`

**`src/screens/LiveWorkoutScreen.tsx` - On-Device ML**
- Uses Mediapipe for real-time pose detection
- ONNX Runtime for exercise classification
- Tracks rep count and form quality
- Provides audio feedback via expo-speech

**`src/screens/FoodRecognitionScreen.tsx` - Food Recognition UI**
- Integrates expo-camera for live camera feed
- Uses image-picker for gallery selection
- Calls `/api/v1/foods/recognize` with image
- Displays nutritional breakdown from AI prediction

---

### `/server` - Node.js Express Backend

**Purpose:** REST API gateway that orchestrates business logic, manages databases (PostgreSQL + MongoDB), handles authentication, and coordinates with the AI service.

```
server/
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── docker-compose.yml        # Multi-container setup (PG, MongoDB, Redis)
├── docker-compose.dev.yml    # Development-specific settings
├── Dockerfile                # Backend container image
├── README.md                 # Backend documentation
├── swagger-guide.html        # Interactive Swagger UI guide
├── WORKOUT_API.md            # Workout endpoint documentation
├── PGADMIN_GUIDE.md          # PostgreSQL admin guide
│
├── src/
│   ├── app.ts                # Express app initialization & middleware setup
│   │
│   ├── config/
│   │   ├── database.ts       # Sequelize (PostgreSQL) + Mongoose (MongoDB) config
│   │   ├── passport.ts       # Passport.js OAuth strategies (Google, Facebook, GitHub)
│   │   ├── jwt.ts            # JWT secret, expiry, algorithm configuration
│   │   ├── swagger.ts        # Swagger/OpenAPI documentation setup
│   │   ├── cloudinary.ts     # Image upload service configuration
│   │   └── settings.ts       # Global app settings
│   │
│   ├── controllers/          # Business logic for each feature
│   │   ├── authController.ts # Login, register, OAuth, token refresh
│   │   ├── userController.ts # User CRUD, profile, body metrics
│   │   ├── workoutController.ts # Workout browse, search, filter
│   │   ├── foodController.ts # Food search, nutrition lookup, AI prediction
│   │   ├── savedWorkoutController.ts # User's saved/favorited workouts
│   │   └── viewController.ts # EJS view rendering (web pages)
│   │
│   ├── models/
│   │   ├── sql/              # PostgreSQL models (Sequelize ORM)
│   │   │   ├── User.ts       # User table: auth, profile, body metrics
│   │   │   ├── Food.ts       # Food table: nutrition data (calories, macros)
│   │   │   ├── Workout.ts    # Workout table: exercises (270+ items)
│   │   │   └── SavedWorkout.ts # Junction table: user ← → workout many-to-many
│   │   │
│   │   ├── mongodb/          # MongoDB collections (Mongoose)
│   │   │   ├── PredictionLog.ts # Logs of AI food predictions
│   │   │   └── UserActivity.ts  # Event log for analytics
│   │   │
│   │   └── index.ts          # Model exports
│   │
│   ├── routes/
│   │   ├── index.ts          # Routes router (delegates to v1 & web)
│   │   ├── v1/
│   │   │   ├── index.ts      # v1 router (aggregates all API routes)
│   │   │   ├── authRoutes.ts    # POST /v1/auth/login, /register, /google, /refresh
│   │   │   ├── userRoutes.ts    # GET/PUT /v1/users/:id (profile CRUD)
│   │   │   ├── foodRoutes.ts    # GET/POST /v1/foods/* (search, recognize)
│   │   │   ├── workoutRoutes.ts # GET /v1/workouts (browse, filter)
│   │   │   └── savedWorkoutRoutes.ts # GET/POST /v1/saved-workouts
│   │   │
│   │   └── web/
│   │       └── authRoutes.ts # GET /auth/google/callback (OAuth redirect)
│   │
│   ├── services/             # Business logic & external integrations
│   │   ├── userService.ts    # User creation, token generation, password reset
│   │   ├── foodService.ts    # Food search, call AI service, nutrition calc
│   │   ├── workoutService.ts # Workout filtering, sorting, search
│   │   ├── aiService.ts      # Wrapper for AI FastAPI service
│   │   ├── emailService.ts   # Email verification via Nodemailer
│   │   ├── cloudinaryService.ts # Image upload to cloud
│   │   ├── socketService.ts  # Socket.IO event broadcasting
│   │   └── cacheService.ts   # Redis caching (optional)
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts   # Global error catching & formatting
│   │   ├── authMiddleware.ts # JWT token verification
│   │   ├── validationMiddleware.ts # Request body/query validation
│   │   ├── corsMiddleware.ts # CORS headers
│   │   └── rateLimiter.ts    # API rate limiting
│   │
│   ├── types/
│   │   ├── index.ts          # TypeScript interfaces for API responses
│   │   ├── auth.ts           # Auth request/response types
│   │   ├── user.ts           # User entity types
│   │   ├── workout.ts        # Workout entity types
│   │   └── api.ts            # Generic API types
│   │
│   ├── utils/
│   │   ├── helpers.ts        # Utility functions (formatters, validators)
│   │   ├── errorClasses.ts   # Custom error classes
│   │   └── logger.ts         # Logging utility
│   │
│   ├── migrations/           # Database schema migrations (Sequelize)
│   │   ├── 20251023195634-InitialCreate.ts       # Create User, Food, Workout tables
│   │   ├── 20251031000000-add-auth-provider.ts   # Add authProvider column
│   │   ├── 20251102000000-create-foods-table.ts  # Food table schema
│   │   ├── 20251210000000-create-workouts-table.ts # Workout table schema
│   │   ├── 20251210000001-create-saved-workouts-table.ts # SavedWorkout junction
│   │   ├── 20251211000000-update-workouts-gif-link-required.ts # Update columns
│   │   └── 20260120000000-update-activity-level-enum.ts # Enum updates
│   │
│   ├── seeders/              # Data population scripts (Sequelize)
│   │   ├── 20251023200124-create-admin-user.ts   # Creates admin user
│   │   ├── 20251102000000-seed-food-nutrition.ts # Loads food nutrition data
│   │   └── 20251210000000-seed-workouts.ts       # Loads 270+ exercises
│   │
│   ├── views/                # EJS HTML templates (web pages)
│   │   ├── email-verification.ejs      # Email verification page
│   │   ├── password-reset.ejs          # Password reset form
│   │   └── index.ejs                   # Landing page
│   │
│   └── public/               # Static files (CSS, JS, images)
│       ├── css/
│       ├── js/
│       └── workouts/gif/     # Exercise GIF files
│
├── uploads/                  # Temporary file uploads directory
├── logs/                     # Application logs
└── data/
    ├── workouts_data.csv     # CSV source for seeding workouts
    └── food_nutrition_data.json # JSON source for food data
```

#### Key Backend Files

**`src/app.ts` - Express Application Initialization**
```typescript
// Responsibilities:
// 1. Express app setup with middleware (helmet, cors, morgan)
// 2. EJS template engine for web pages
// 3. Static file serving
// 4. Socket.IO initialization on HTTP server
// 5. Database initialization (PostgreSQL + MongoDB)
// 6. Route mounting with versioning
// 7. Error handling middleware
```

**`src/config/passport.ts` - OAuth Strategies**
- Configures Google OAuth 2.0 Strategy
  - Client ID/Secret from environment
  - Callback URL for redirect
  - User lookup/creation logic
- Implements serializeUser/deserializeUser for session management
- Handles mixed-auth scenarios (user exists with different provider)

**`src/config/jwt.ts` - Token Configuration**
```typescript
export const jwtConfig = {
  secret: process.env.JWT_SECRET,      // HS256 signing key
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  expiresIn: '15m',                    // Access token expiry
  refreshExpiresIn: '7d',              // Refresh token expiry
  issuer: 'icoach-app',
  audience: 'icoach-users',
  algorithm: 'HS256',
};

export const cookieConfig = {
  httpOnly: true,                      // Prevents JS access
  secure: process.env.NODE_ENV === 'production',  // HTTPS only
  sameSite: 'strict',                  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,    // 7 days
};
```

**`src/config/database.ts` - Database Setup**
- Initializes Sequelize for PostgreSQL
  - Connection pooling (max: 20 connections)
  - Logging in development mode
  - Auto-sync models in development
- Initializes Mongoose for MongoDB
  - URI from environment variable
  - Connection reuse
- Provides error handling for both databases

**`src/models/sql/User.ts` - User Model**
```typescript
// Database columns:
// - id (auto-increment PK)
// - email, username (unique)
// - password (bcrypt hashed, null for OAuth)
// - firstName, lastName, avatar
// - phone, dateOfBirth, gender
// - Fitness: height, weight, BMI, fitnessGoal, activityLevel, bodyFatPercentage
// - Auth: isEmailVerified, emailVerificationToken, passwordResetToken
// - authProvider: 'regular' | 'google'
// - role: 'user' | 'coach' | 'admin'
// - lastLogin, createdAt, updatedAt

// Instance methods:
// - comparePassword(candidatePassword): boolean
// - calculateBMI(): number
// - getBMICategory(): string
// - calculateRecommendedCalories(): number
// - getFullName(): string
// - toJSON(): object (excludes sensitive fields)
```

**`src/models/sql/Workout.ts` - Exercise Database**
```typescript
// Database columns:
// - id (PK)
// - name: string (e.g., "Barbell Squat")
// - body_part: string (e.g., "legs")
// - target_area: string (e.g., "quadriceps")
// - equipment: string | null (e.g., "barbell")
// - level: string (e.g., "beginner", "intermediate", "advance")
// - description: string
// - gif_link: string (URL to exercise GIF)

// Total records: 270+ unique exercises
```

**`src/models/sql/Food.ts` - Nutrition Database**
```typescript
// Database columns:
// - id (PK)
// - name: string (food name)
// - calories: number (per 100g)
// - protein, carbohydrate, fat, sugar: number (grams per 100g)
// - pic: string | null (food image)

// Instance methods:
// - getMacroPercentages(): {protein, carbs, fat}
// - getServingNutrition(grams): {calories, macros}
// - getProteinEfficiency(): number
// - isHighProtein(): boolean
```

**`src/services/userService.ts` - Authentication Logic**
- `UserService.register(data)`: Create account with bcrypt password hashing
- `UserService.login(email, password)`: Verify credentials
- `UserService.generateAccessToken(id, email, role)`: Create JWT (15min)
- `UserService.generateRefreshToken(id)`: Create refresh token (7d)
- `UserService.refreshAccessToken(refreshToken)`: Validate & regenerate access token
- `UserService.createOrUpdateGoogleUser(profile)`: OAuth user creation

**`src/services/aiService.ts` - AI Integration**
- Wrapper around Python FastAPI service
- Methods:
  - `predictFood(imagePath)`: Send image → get predictions
  - `getNutritionData(foodName)`: Lookup in PostgreSQL fallback
  - Error handling & retries for network issues

**`src/routes/v1/authRoutes.ts` - Authentication Endpoints**
```
POST /api/v1/auth/login
  Request: {emailOrUsername, password}
  Response: {user, accessToken, refreshToken}

POST /api/v1/auth/register
  Request: {email, username, password, firstName?, lastName?}
  Response: {user, accessToken, refreshToken}

POST /api/v1/auth/google
  Request: {idToken}
  Response: {user, accessToken, refreshToken}

POST /api/v1/auth/refresh
  Request: {refreshToken}
  Response: {accessToken}

GET /auth/google/callback
  (OAuth redirect handler)
```

**`src/routes/v1/foodRoutes.ts` - Food API**
```
GET /api/v1/foods?search=apple&limit=20
  Returns: Array of Food objects with nutrition info

POST /api/v1/foods/recognize
  Multipart form-data: {image: File}
  Response: {success, predicted_food, confidence, food_data, suggestions}
  (Calls AI Service internally)
```

**`src/routes/v1/workoutRoutes.ts` - Workout API**
```
GET /api/v1/workouts?bodyPart=legs&level=beginner&equipment=barbell
  Query params: {bodyPart?, targetArea?, equipment?, level?, page, limit}
  Response: {data: Workout[], pagination}

GET /api/v1/workouts/:id
  Response: Workout object with full details + GIF URL
```

---

### `/AI` - Python FastAPI ML Service

**Purpose:** Standalone Python service running machine learning models for food recognition and nutrition data integration.

```
AI/
├── main.py                   # FastAPI app entry point
├── requirements-api.txt      # Python dependencies
├── Dockerfile                # Container image
├── docker-compose.yml        # Local development with PostgreSQL
├── README.md                 # AI service documentation
├── QUICKSTART.md             # Setup instructions
├── DOCKER_GUIDE.md           # Docker deployment guide
│
├── AI_API_Features/          # Main service package
│   ├── __init__.py
│   │
│   ├── config/               # Configuration
│   │   ├── __init__.py
│   │   ├── settings.py       # Pydantic settings (env vars)
│   │   ├── database.py       # SQLAlchemy + PostgreSQL config
│   │   └── logging.py        # Logging configuration
│   │
│   ├── models/               # Pydantic & SQL models
│   │   ├── __init__.py
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── database.py       # SQLAlchemy ORM models
│   │
│   ├── routers/              # API endpoints
│   │   ├── __init__.py
│   │   └── food.py           # POST /api/food/predict endpoint
│   │
│   ├── services/             # Business logic
│   │   ├── __init__.py
│   │   ├── ml_service.py     # EfficientNetB0 model loading & inference
│   │   └── db_service.py     # Database queries for food data
│   │
│   └── utils/                # Utilities
│       ├── __init__.py
│       └── helpers.py        # Image preprocessing, validation
│
├── food_predict_feature/     # Standalone prediction module
│   ├── app.py                # Streamlit demo UI
│   ├── best_model_food100.keras  # Trained model weights (100 food classes)
│   ├── class_names.json      # Mapping of model outputs to food names
│   └── food detection model.ipynb # Jupyter notebook (training code)
│
└── data/
    └── food_nutrition_data.json # Food metadata source
```

#### Key AI Files

**`main.py` - FastAPI Application**
```python
# Responsibilities:
# 1. Initialize FastAPI app with title, version, docs_url, redoc_url
# 2. Configure CORS middleware (allows requests from backends)
# 3. Register food_router (router with /api/food/* endpoints)
# 4. Setup global exception handler
# 5. Define startup event (load ML model on server start)
# 6. Startup banner with API documentation links
```

**`AI_API_Features/config/settings.py` - Configuration**
```python
# Pydantic settings loaded from environment variables:
# - MODEL_PATH: Path to best_model_food100.keras
# - CLASS_NAMES_PATH: Path to class_names.json
# - DATABASE_URL: PostgreSQL connection string
# - DEBUG: Boolean for verbose logging
# - CORS_ORIGINS: List of allowed origins
# - API_TITLE, API_VERSION, API_DESCRIPTION: Metadata
```

**`AI_API_Features/services/ml_service.py` - Food Recognition**
```python
class FoodRecognitionModel:
    def __init__(self, model_path, class_names_path, img_size=224):
        # Load Keras model (EfficientNetB0)
        # Load class names JSON mapping
        
    def predict(self, image_bytes):
        # Preprocess: resize to 224x224, normalize pixels
        # Pass through model.predict()
        # Return top-3 predictions with confidence scores
        # Returns: [(food_name, confidence), ...]
```

**`AI_API_Features/routers/food.py` - API Endpoint**
```python
@router.post("/api/food/predict")
async def predict_food(file: UploadFile, db: Session = Depends(get_db)):
    """
    Endpoint: POST /api/food/predict
    
    Process:
    1. Read image bytes from UploadFile
    2. Call FoodRecognitionModel.predict(image_bytes)
    3. Get top prediction (food_name, confidence)
    4. Query database: SELECT * FROM foods WHERE name = food_name
    5. If found: Return nutritional_data
    6. If not found: Return alternative suggestions (top-N from model)
    7. Log prediction to database for analytics
    
    Response:
    {
      "success": bool,
      "predicted_food": "apple",
      "confidence": 0.92,
      "food_data": {
        "calories": 52,
        "protein": 0.3,
        "carbohydrate": 14,
        "fat": 0.2,
        "sugar": 10
      },
      "message": "Food identified and found in database",
      "suggestions": ["banana", "orange"]  # if not found
    }
    """
```

---

## Core Logic Deep Dive

### 1. Authentication & Authorization

#### JWT Token Strategy

```
ACCESS TOKEN (15 minutes):
├─ Claims:
│  ├─ sub: user_id
│  ├─ email: user@example.com
│  ├─ role: 'user' | 'coach' | 'admin'
│  ├─ iat: issued_at_timestamp
│  ├─ exp: expiry_timestamp (current_time + 15min)
│  ├─ iss: 'icoach-app'
│  └─ aud: 'icoach-users'
├─ Algorithm: HS256 (HMAC with SHA-256)
├─ Secret: process.env.JWT_SECRET (keep in .env)
└─ Usage: Authorization: Bearer <access_token>

REFRESH TOKEN (7 days):
├─ Claims: {sub: user_id, exp: current_time + 7d}
├─ Purpose: Generate new access token without re-login
├─ Storage: HttpOnly cookie (secure flag in production)
└─ Rotation: Each refresh generates new refresh token
```

#### Authentication Flow Implementation

**Regular Sign-Up:**
```typescript
// POST /api/v1/auth/register
async register(data: RegisterData) {
  // 1. Validate input
  if (!isValidEmail(data.email)) throw new ValidationError();
  
  // 2. Check if user exists
  const existing = await User.findOne({where: {email: data.email}});
  if (existing) throw new ConflictError("Email already registered");
  
  // 3. Hash password (bcrypt with salt rounds = 10)
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // 4. Create user in PostgreSQL
  const user = await User.create({
    email: data.email,
    username: data.username,
    password: hashedPassword,
    firstName: data.firstName || '',
    isEmailVerified: false,
    authProvider: 'regular',
  });
  
  // 5. Generate tokens
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);
  
  // 6. Send verification email (async)
  await emailService.sendVerification(user.email, verificationLink);
  
  // 7. Return user + tokens to client
  return {user: user.toJSON(), accessToken, refreshToken};
}
```

**Google OAuth Flow:**
```typescript
// POST /api/v1/auth/google
async googleOAuth(idToken: string) {
  // 1. Verify Google ID token with Google's public keys
  const decoded = await oauth2Client.verifyIdToken({idToken});
  const {email, name, picture} = decoded.getPayload();
  
  // 2. Check if user exists by email
  let user = await User.findOne({where: {email}});
  
  if (user) {
    // User already exists
    if (user.authProvider !== 'google') {
      throw new Error(
        `Email registered with ${user.authProvider}. Please use ${user.authProvider} to login.`
      );
    }
    // Update last login
    user.lastLogin = new Date();
    await user.save();
  } else {
    // Create new user from Google profile
    user = await User.create({
      email,
      username: email.split('@')[0] + '_' + randomString(8),
      firstName: name?.givenName || 'User',
      avatar: picture || null,
      isEmailVerified: true,  // Google email is pre-verified
      authProvider: 'google',
      password: null,  // OAuth users don't have passwords
    });
  }
  
  // 3. Generate tokens
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);
  
  // 4. Trigger Socket.IO event if email newly verified
  if (!user.isEmailVerified) {
    socketService.notifyEmailVerified(user.id);
  }
  
  return {user: user.toJSON(), accessToken, refreshToken};
}
```

**Token Verification Middleware:**
```typescript
// middleware/authMiddleware.ts
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({error: 'Missing token'});
  }
  
  const token = authHeader.substring(7);  // Remove "Bearer " prefix
  
  // 2. Verify token signature & expiry
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;  // Attach user to request
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({error: 'Token expired', code: 'TOKEN_EXPIRED'});
    }
    return res.status(401).json({error: 'Invalid token'});
  }
}

// Applied to protected routes:
// router.get('/api/v1/users/:id', authenticateJWT, userController.getUser);
```

#### Mobile App Token Management

```typescript
// application/src/context/AuthContext.tsx
export const AuthProvider = ({children}) => {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  
  // On mount: restore tokens from AsyncStorage
  useEffect(() => {
    const restoreTokens = async () => {
      const savedToken = await AsyncStorage.getItem('@icoach_token');
      const savedRefreshToken = await AsyncStorage.getItem('@icoach_refresh_token');
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
    };
    restoreTokens();
  }, []);
  
  // Login function persists tokens
  const login = async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem('@icoach_token', accessToken);
    await AsyncStorage.setItem('@icoach_refresh_token', refreshToken);
    setToken(accessToken);
    setRefreshToken(refreshToken);
  };
  
  // Auto-refresh on token expiry
  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        body: JSON.stringify({refreshToken}),
      });
      const {accessToken, refreshToken: newRefreshToken} = await response.json();
      
      await AsyncStorage.setItem('@icoach_token', accessToken);
      await AsyncStorage.setItem('@icoach_refresh_token', newRefreshToken);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      
      return accessToken;
    } catch (error) {
      // Refresh failed - logout user
      logout();
      return null;
    }
  };
};
```

**API Call Wrapper with Automatic Retry:**
```typescript
// application/src/services/api.ts
export const apiCallWithRefresh = async <T>(
  apiCall: (token: string) => Promise<T>,
  token: string,
  retryCount = 0
): Promise<T> => {
  try {
    return await apiCall(token);  // First attempt
  } catch (error) {
    const isAuthError = error?.message?.includes('expired') ||
                       error?.message?.includes('Authentication');
    
    if (isAuthError && retryCount === 0) {
      // Token expired - refresh it
      const newToken = await globalRefreshTokenFunction();
      
      if (newToken) {
        // Retry request with new token
        return await apiCallWithRefresh(apiCall, newToken, retryCount + 1);
      }
    }
    throw error;
  }
};
```

---

### 2. AI Integration: Food Recognition Pipeline

#### End-to-End Flow

```
Step 1: Mobile App Captures Image
├─ User opens FoodRecognitionScreen
├─ Takes photo or selects from gallery
└─ Image is 1-5 MB PNG/JPG, max 2560x2560px

Step 2: Mobile App Sends to Backend
├─ POST /api/v1/foods/recognize
├─ Multipart form: {image: File}
├─ Header: Authorization: Bearer <accessToken>
└─ Backend receives FormData

Step 3: Backend Processes Image
├─ Validates file size & type
├─ Generates temp file path
├─ Forwards to AI Service (internal HTTP call)
└─ Form-data: {image: <file_blob>}

Step 4: AI Service Runs ML Inference
├─ Load image from bytes
├─ Resize to 224x224 (EfficientNetB0 input size)
├─ Normalize pixels (ImageNet mean/std)
├─ Run through trained model
├─ Get model.predict() output (1000-D vector if base model)
├─ Softmax activation → confidence scores
├─ Top-3 predictions with probabilities
└─ Examples: [(apple: 0.92), (banana: 0.05), (orange: 0.03)]

Step 5: AI Service Looks Up Nutrition
├─ Query PostgreSQL: SELECT * FROM foods WHERE name ILIKE 'apple'
├─ If exact match found: Return food object
├─ If not found: Return top suggestions (alternatives)
└─ Response JSON:
    {
      success: true,
      predicted_food: "apple",
      confidence: 0.92,
      food_data: {
        name: "apple",
        calories: 52,
        protein: 0.3,
        carbohydrate: 14,
        fat: 0.2,
        sugar: 10
      }
    }

Step 6: Backend Logs Prediction
├─ Insert into MongoDB collection: predictions
├─ Fields: {userId, predicted_food, confidence, timestamp, feedback}
├─ Used for training improvements
└─ Enables analytics on food detection accuracy

Step 7: Backend Returns to Mobile
├─ Return full response to app
├─ App displays nutritional breakdown
├─ Suggests similar foods if needed
└─ User can log this meal to food diary
```

#### EfficientNetB0 Model Details

```python
# Architecture
EfficientNetB0
├─ Image input: 224x224x3 (RGB)
├─ Blocks: 16 mobile inverted residual blocks
├─ Channels: 1280 base
├─ Parameters: ~5.3M (lightweight)
├─ Custom top layers:
│  ├─ GlobalAveragePooling2D()
│  ├─ Dense(512, activation='relu')
│  ├─ Dropout(0.2)
│  ├─ Dense(256, activation='relu')
│  └─ Dense(100, activation='softmax')  # 100 food classes
└─ Trainable parameters: ~1.2M (last 4 layers)

# Training
├─ Dataset: Food101 + custom Arabic dishes (~10k images)
├─ Data augmentation: rotation, scaling, color jittering
├─ Optimizer: Adam (lr=0.001)
├─ Loss: Categorical Crossentropy
├─ Epochs: 50 (early stopping at 40)
├─ Final accuracy: ~89% top-1, ~97% top-3
└─ Model file: best_model_food100.keras (~50 MB)

# Class Names (100 food classes)
├─ Western dishes: pizza, pasta, burger, salad, sandwich
├─ Asian: sushi, pad_thai, dim_sum, fried_rice
├─ Middle Eastern: falafel, hummus, shawarma, kebab, fattoush
├─ Desserts: cake, ice_cream, donut, chocolate
└─ Others: soup, juice, coffee, smoothie, etc.
```

#### ML Service Implementation

```python
# AI_API_Features/services/ml_service.py
class FoodRecognitionModel:
    def __init__(self, model_path, class_names_path):
        self.model = tf.keras.models.load_model(model_path)
        with open(class_names_path) as f:
            self.class_names = json.load(f)  # List of 100 food names
    
    def predict(self, image_bytes: bytes) -> List[Tuple[str, float]]:
        """Predict food in image"""
        # 1. Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # 2. Resize to model input size
        image = image.resize((224, 224))
        
        # 3. Convert to numpy array
        image_array = np.array(image) / 255.0  # Normalize to [0, 1]
        
        # 4. Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)
        
        # 5. Run model inference
        predictions = self.model.predict(image_array)[0]  # [0] to get first batch
        
        # 6. Get top-3 with confidence scores
        top_indices = np.argsort(predictions)[-3:][::-1]  # Reverse for descending
        top_predictions = [
            (self.class_names[idx], float(predictions[idx]))
            for idx in top_indices
        ]
        
        return top_predictions
        # Returns: [("apple", 0.92), ("banana", 0.05), ("orange", 0.03)]

# Integration in FastAPI endpoint
@router.post("/api/food/predict")
async def predict_food(file: UploadFile, db: Session = Depends(get_db)):
    # Read image bytes
    image_bytes = await file.read()
    
    # Get predictions from ML model
    predictions = get_model().predict(image_bytes)
    
    # Try to find in database (top prediction first)
    food = None
    suggestions = []
    
    for food_name, confidence in predictions:
        db_food = db.query(Food).filter(
            Food.name.ilike(f"%{food_name}%")
        ).first()
        
        if db_food:
            food = db_food
            break
        else:
            suggestions.append(food_name)
    
    # Log prediction to MongoDB
    prediction_log = {
        "predicted_food": predictions[0][0],
        "confidence": predictions[0][1],
        "found_in_db": food is not None,
        "user_id": request.user.id,
        "timestamp": datetime.now()
    }
    db_logging.insert_prediction(prediction_log)
    
    return {
        "success": food is not None,
        "predicted_food": predictions[0][0],
        "confidence": predictions[0][1],
        "food_data": food.to_dict() if food else None,
        "suggestions": suggestions[:3]
    }
```

---

### 3. Database Schema & Relationships

#### PostgreSQL Schema (Relational Data)

```sql
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NULL,  -- NULL for OAuth users
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    avatar VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    height INT,  -- centimeters
    weight INT,  -- kilograms
    fitness_goal VARCHAR(50),  -- weight_loss, muscle_gain, maintenance
    activity_level VARCHAR(50),  -- sedentary, lightly_active, etc.
    body_fat_percentage DECIMAL(5,2),
    bmi DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    role VARCHAR(20) DEFAULT 'user',  -- user, coach, admin
    auth_provider VARCHAR(50) DEFAULT 'regular',  -- regular, google, facebook
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foods Table
CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    calories INT NOT NULL,  -- per 100g
    protein DECIMAL(10,2) NOT NULL,  -- grams
    carbohydrate DECIMAL(10,2) NOT NULL,
    fat DECIMAL(10,2) NOT NULL,
    sugar DECIMAL(10,2) DEFAULT 0,
    pic VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workouts Table (Exercise Library)
CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    body_part VARCHAR(100) NOT NULL,  -- chest, back, legs, etc.
    target_area VARCHAR(100) NOT NULL,  -- pectorals, biceps, quadriceps, etc.
    equipment VARCHAR(100),  -- barbell, dumbbell, machine, bodyweight, etc.
    level VARCHAR(50) NOT NULL,  -- beginner, intermediate, advance
    description TEXT,
    gif_link VARCHAR(500) NOT NULL,  -- URL to exercise demonstration GIF
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SavedWorkouts Table (Many-to-Many: Users ← → Workouts)
CREATE TABLE saved_workouts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id INT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workout_id)
);
```

#### Data Relationships

```
User (1) ──────────── SavedWorkout (M) ──────────── (M) Workout
         saved by                     references
  
  Example:
  - User 1 saves Workouts: [5, 12, 89]
  - User 2 saves Workouts: [5, 33, 67]
  - Workout 5 is saved by Users: [1, 2, 3, ...]
```

#### MongoDB Schema (Flexible/Logging Data)

```python
# PredictionLog collection
{
    "_id": ObjectId(),
    "user_id": 1,
    "predicted_food": "apple",
    "confidence": 0.92,
    "found_in_db": true,
    "actual_food": "apple",  # User feedback
    "feedback_score": 1,  # 1=correct, -1=incorrect, 0=unsure
    "model_version": "v1.0",
    "timestamp": ISODate("2026-03-01T10:30:00Z"),
    "image_hash": "abc123def456...",
    "device": "iPhone",
    "os_version": "17.2"
}

# UserActivity collection
{
    "_id": ObjectId(),
    "user_id": 1,
    "action": "recognized_food",
    "event_type": "food_prediction_success",
    "metadata": {
        "food": "apple",
        "calories": 52,
        "timestamp": "2026-03-01T10:30:00Z"
    }
}
```

---

### 4. Real-Time Features via Socket.IO

#### Email Verification Event Flow

```typescript
// Backend: server/src/services/socketService.ts
class SocketService {
  private io: Server;
  
  // Map of userId -> socket connections
  private userSockets = new Map<number, Set<string>>();
  
  notifyEmailVerified(userId: number) {
    // Get all socket connections for this user
    const sockets = this.userSockets.get(userId);
    
    if (sockets) {
      // Emit to all user's connected devices
      sockets.forEach(socketId => {
        this.io.to(socketId).emit('emailVerified', {
          success: true,
          message: 'Email verified successfully!',
          user: { id: userId, isEmailVerified: true }
        });
      });
    }
  }
  
  // Register user socket
  registerUserSocket(userId: number, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(socketId);
  }
}

// Mobile App: application/src/services/socketService.ts
class SocketIOClient {
  connect(userId: number, handlers: {
    onEmailVerified: (data) => void,
    onConnected: () => void,
    onDisconnected: (reason: string) => void
  }) {
    const socket = io(SOCKET_URL, {
      auth: {userId, token: getAccessToken()}
    });
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      handlers.onConnected();
    });
    
    socket.on('emailVerified', (data) => {
      console.log('Email verified event received:', data);
      handlers.onEmailVerified(data);
    });
    
    socket.on('disconnect', (reason) => {
      handlers.onDisconnected(reason);
    });
  }
}

// Mobile App: application/src/context/AuthContext.tsx
const handleEmailVerified = useCallback((data) => {
  if (data.success && user) {
    // Update user state with verified flag
    const updatedUser = {...user, isEmailVerified: true};
    setUser(updatedUser);
    
    // Persist to storage
    AsyncStorage.setItem('@icoach_user', JSON.stringify(updatedUser));
    
    // Show success notification
    Alert.alert('Email Verified!', 'You now have full access to all features.');
  }
}, [user]);
```

---

## Extensibility Guide

### Adding a New Exercise

**Step 1: Add to Workout Database**

```sql
-- Manual SQL insert (or use Sequelize)
INSERT INTO workouts (name, body_part, target_area, equipment, level, description, gif_link)
VALUES (
  'Push-ups',
  'chest',
  'pectorals',
  'bodyweight',
  'beginner',
  'Standard push-up exercise using bodyweight',
  'https://cdn.example.com/workouts/gifs/pushups.gif'
);

-- Or update seeders/20251210000000-seed-workouts.ts
```

**Step 2: Update Seeder (if bulk import)**

```typescript
// server/src/seeders/20251210000000-seed-workouts.ts
export async function up(queryInterface: QueryInterface) {
  const newWorkouts = [
    {
      name: 'Dumbbell Bench Press',
      body_part: 'chest',
      target_area: 'pectorals',
      // ... other fields
    },
    // ... more exercises
  ];
  
  await queryInterface.bulkInsert('workouts', newWorkouts);
}
```

**Step 3: (Optional) Add to On-Device ML**

If you want live rep counting for this exercise:
- Add to ONNX model input classes
- Retrain jumping_jacks.onnx or create new model
- Update application/ML_Models/ with new model file
- Update pose detection logic in application/src/services/aiFitnessEngine/

**Step 4: Test**

```typescript
// application/src/screens/WorkoutsScreen.tsx - should now show in list
GET /api/v1/workouts?name=Dumbbell%20Bench%20Press
```

---

### Adding a New AI Model

**Step 1: Train Model (Python)**

```python
# AI/food_predict_feature/food detection model.ipynb
# OR create new notebook: AI/new_model_training.ipynb

import tensorflow as tf
from tensorflow.keras import layers, models

# 1. Create architecture
model = models.Sequential([
    tf.keras.applications.EfficientNetB0(include_top=False),
    layers.GlobalAveragePooling2D(),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(new_num_classes, activation='softmax')
])

# 2. Compile & train
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(train_dataset, validation_data=val_dataset, epochs=50)

# 3. Save model & class names
model.save('new_model.keras')
with open('new_class_names.json', 'w') as f:
    json.dump(class_names_list, f)
```

**Step 2: Move to AI Service**

```bash
# Copy model files to AI service
cp new_model.keras AI/food_predict_feature/
cp new_class_names.json AI/food_predict_feature/
```

**Step 3: Update Configuration**

```python
# AI/AI_API_Features/config/settings.py
class Settings(BaseSettings):
    MODEL_PATH: str = "food_predict_feature/new_model.keras"
    CLASS_NAMES_PATH: str = "food_predict_feature/new_class_names.json"
    # ... other settings
```

**Step 4: Update ML Service**

```python
# AI/AI_API_Features/services/ml_service.py
# Just change paths - rest of code handles it

# Or create new model class:
class DietRecognitionModel(FoodRecognitionModel):
    """Specialized model for diet type recognition"""
    # Custom processing logic
```

**Step 5: Deploy**

```bash
# Rebuild Docker image
docker build -t icoach-ai:new .

# Update docker-compose.yml with new image tag
# Restart service
docker-compose restart ai-service
```

---

### Adding a New API Endpoint

**Example: Create endpoint to get user's meal history**

**Step 1: Create Database Model (if needed)**

```typescript
// server/src/models/sql/MealLog.ts (already exists via seeder)
interface MealLogAttributes {
  id: number;
  user_id: number;
  food_id: number;
  serving_grams: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: Date;
}
```

**Step 2: Create Controller Logic**

```typescript
// server/src/controllers/foodController.ts - add new method
export async function getUserMealHistory(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const {startDate, endDate, page = 1, limit = 50} = req.query;
    
    // Validate date range
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Query MealLog with joins
    const mealLogs = await MealLog.findAndCountAll({
      where: {
        user_id: userId,
        logged_at: {[Op.between]: [start, end]}
      },
      include: [{
        model: Food,
        attributes: ['name', 'calories', 'protein', 'carbohydrate', 'fat']
      }],
      limit: limit as number,
      offset: ((page as number - 1) * (limit as number)),
      order: [['logged_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: mealLogs.rows,
      pagination: {
        total: mealLogs.count,
        page,
        limit,
        totalPages: Math.ceil(mealLogs.count / (limit as number))
      }
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
}
```

**Step 3: Add Route**

```typescript
// server/src/routes/v1/foodRoutes.ts
import {getUserMealHistory} from '../../controllers/foodController.js';

router.get('/meal-history', authenticateJWT, getUserMealHistory);
// GET /api/v1/foods/meal-history?startDate=2026-01-01&endDate=2026-03-01
```

**Step 4: Add Swagger Documentation**

```typescript
/**
 * @swagger
 * /api/v1/foods/meal-history:
 *   get:
 *     summary: Get user's meal history
 *     parameters:
 *       - name: startDate
 *         in: query
 *         type: string
 *         format: date
 *       - name: endDate
 *         in: query
 *         type: string
 *         format: date
 *     responses:
 *       200:
 *         description: Meal logs retrieved successfully
 */
```

**Step 5: Test Endpoint**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/v1/foods/meal-history?startDate=2026-01-01&endDate=2026-03-01"
```

**Step 6: Update Mobile App (if needed)**

```typescript
// application/src/services/api.ts
export const foodService = {
  getMealHistory: async (token: string, startDate: string, endDate: string) => {
    const response = await fetch(
      `${API_BASE_URL}/foods/meal-history?startDate=${startDate}&endDate=${endDate}`,
      {headers: {Authorization: `Bearer ${token}`}}
    );
    return response.json();
  }
};

// application/src/screens/ProgressScreen.tsx
const loadMealHistory = async () => {
  const data = await foodService.getMealHistory(
    token,
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  );
  setMealLogs(data.data);
};
```

---

## Setup & Deployment

### Local Development Setup

#### Prerequisites

```
- Node.js 18+ LTS
- Python 3.9+
- PostgreSQL 15+
- MongoDB 7.0+
- Docker & Docker Compose
- Git
```

#### Backend Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd icoach-app/server

# 2. Install Node dependencies
npm install

# 3. Create .env file
cat > .env << EOF
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=icoach_db

# MongoDB
MONGODB_URI=mongodb://localhost:27017/icoach_nosql
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,exp://localhost:8081

# Cloudinary (image uploads)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Email
EMAIL_FROM=noreply@icoach.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EOF

# 4. Start databases with Docker Compose
docker-compose up -d postgres mongodb redis

# 5. Run database migrations
npm run migrate

# 6. Seed initial data
npm run seed

# 7. Start backend server in dev mode
npm run dev
# Server runs on http://localhost:5000
```

#### AI Service Setup

```bash
cd icoach-app/AI

# 1. Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install Python dependencies
pip install -r requirements-api.txt

# 3. Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:your_password@localhost:5433/icoach_db
DEBUG=True
CORS_ORIGINS=http://localhost:5000,http://localhost:5173
HOST=0.0.0.0
PORT=8000
MODEL_PATH=food_predict_feature/best_model_food100.keras
CLASS_NAMES_PATH=food_predict_feature/class_names.json
EOF

# 4. Start AI service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Service runs on http://localhost:8000
# Docs: http://localhost:8000/docs
```

#### Mobile App Setup

```bash
cd icoach-app/application

# 1. Install dependencies
npm install

# 2. Create .env file
cat > .env << EOF
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
EOF

# 3. Start Expo dev server
npm start

# 4. Open on device
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code for physical device
```

---

### Docker Deployment

#### Production Deployment

```bash
# 1. Build Docker images
docker-compose build

# 2. Use environment file for secrets
cp .env.production .env

# 3. Start all services
docker-compose up -d

# 4. Verify services
docker-compose ps
docker-compose logs -f

# 5. Run migrations inside container
docker-compose exec server npm run migrate
docker-compose exec server npm run seed
```

#### Docker Compose Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: $POSTGRES_DB
      POSTGRES_USER: $POSTGRES_USER
      POSTGRES_PASSWORD: $POSTGRES_PASSWORD
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER"]

  mongodb:
    image: mongo:7-jammy
    environment:
      MONGO_INITDB_ROOT_USERNAME: $MONGO_ROOT_USER
      MONGO_INITDB_ROOT_PASSWORD: $MONGO_ROOT_PASSWORD
    ports:
      - "27018:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./server
    environment:
      DATABASE_URL: postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:admin@mongodb:27017
      REDIS_URL: redis://redis:6379
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_started

  ai-service:
    build: ./AI
    environment:
      DATABASE_URL: postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB
    ports:
      - "8000:8000"
    depends_on:
      - postgres
```

---

### Configuration References

#### Key Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | Signing key for access tokens | `your-secret-key` |
| `POSTGRESQL_PASSWORD` | Database password | `strong_password` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `xxx.apps.googleusercontent.com` |
| `CLOUDINARY_NAME` | Image upload service | `your-cloudinary-account` |
| `AI_SERVICE_URL` | ML service endpoint | `http://localhost:8000` |
| `CORS_ORIGIN` | Allowed frontend origins | `http://localhost:3000,exp://localhost:8081` |

#### Database Initialization

```bash
# PostgreSQL: Manual access
psql -h localhost -U postgres -d icoach_db

# MongoDB: Using mongosh
mongosh mongodb://admin:admin@localhost:27017/icoach_nosql

# Sequelize migrations (Node.js)
npm run migrate        # Run pending migrations
npm run migrate:undo   # Rollback last migration
npm run seed           # Run all seeders
```

---

### Troubleshooting

#### Common Issues

**Q: "Connection refused" on PostgreSQL**
- Ensure Docker container is running: `docker-compose ps`
- Check port mapping: `docker-compose port postgres`
- Verify credentials in .env file

**Q: "ModuleNotFoundError: No module named 'tensorflow'"**
- Recreate Python venv and reinstall: `pip install -r requirements-api.txt`
- Check Python version (3.9+): `python --version`

**Q: "CORS error" when calling API from mobile app**
- Ensure `CORS_ORIGIN` includes your current IP/host
- Add `Authorization` header to `allowedHeaders`

**Q: "Token expired" immediately after login**
- Check `JWT_SECRET` is consistent across app restarts
- Verify system clock synchronization

**Q: "Food not found in database" for simple items**
- Extend food_nutrition_data.json with more items
- Re-run seeder: `npm run seed`

---

## Additional Resources

### API Documentation

- Swagger UI: `http://localhost:5000/swagger`
- ReDoc: `http://localhost:5000/redoc`
- Backend README: [server/README.md](server/README.md)
- Workout API: [server/WORKOUT_API.md](server/WORKOUT_API.md)

### Architecture Diagrams

- System topology in this document: High-Level Architecture
- Database schema in this document: Core Logic Deep Dive
- Authentication flow in this document: Authentication & Authorization

### Contact & Support

- **Backend Lead:** Check server/README.md
- **AI Lead:** Check AI/README.md
- **Mobile Lead:** Check application/README.md

---

**Document End**

*This report should be updated whenever major architectural changes are made.*

