# Icoach Server

A comprehensive Node.js + TypeScript Express server with authentication, multi-database support, and enterprise features.

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up databases:**
   - Configure PostgreSQL connection in `.env`
   - Configure MongoDB connection in `.env`
   - Run migrations: `npm run migrate` (when implemented)

5. **Start development server:**
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:3000` with auto-reload enabled.

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production server (requires build first) |
| `npm test` | Run tests (not configured yet) |

## 🛠 Technology Stack

### Core
- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js

### Authentication & Security
- **JWT:** jsonwebtoken
- **OAuth:** Passport.js (Google, Facebook, GitHub)
- **Password Hashing:** bcryptjs
- **Security:** Helmet, CORS, Rate Limiting

### Databases
- **SQL:** PostgreSQL with Sequelize ORM
- **NoSQL:** MongoDB with Mongoose ODM

### Development & Testing
- **Development:** nodemon, ts-node
- **Testing:** Jest, Supertest
- **Code Quality:** ESLint, Prettier
- **Logging:** Winston, Morgan

### File Handling & Communication
- **File Upload:** Multer
- **Email:** Nodemailer
- **Validation:** Joi, express-validator

## 📁 Project Structure

```
server/
├── src/
│   ├── app.ts                    # Main application setup
│   ├── server.ts                 # Server entry point
│   ├── auth/                     # Authentication logic
│   │   ├── jwt.service.ts        # JWT token handling
│   │   ├── middleware.ts         # Auth middleware
│   │   └── strategies/           # Passport strategies
│   │       ├── local.strategy.ts
│   │       ├── jwt.strategy.ts
│   │       ├── google.strategy.ts
│   │       ├── facebook.strategy.ts
│   │       └── github.strategy.ts
│   ├── config/                   # Configuration files
│   │   ├── database.ts           # Database connections
│   │   ├── jwt.ts               # JWT configuration
│   │   ├── oauth.ts             # OAuth providers config
│   │   └── index.ts             # Main config export
│   ├── controllers/              # Request handlers
│   ├── database/                 # Database related files
│   │   ├── migrations/           # SQL migrations
│   │   └── seeders/             # Database seeders
│   ├── events/                   # Event listeners
│   ├── jobs/                     # Background jobs
│   ├── middlewares/              # Custom middleware
│   ├── models/                   # Database models
│   │   ├── sql/                 # Sequelize models
│   │   └── nosql/               # Mongoose schemas
│   ├── notifications/            # Notification services
│   ├── routes/                   # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   ├── services/                 # Business logic
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/                    # Utility functions
│   └── validators/               # Input validation schemas
├── tests/                        # Test files
│   ├── integration/              # Integration tests
│   └── unit/                     # Unit tests
├── uploads/                      # File uploads directory
├── logs/                         # Log files
├── docs/                         # Documentation
├── dist/                         # Compiled JavaScript
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```
This command uses nodemon to automatically restart the server when files change.

### Building for Production
```bash
npm run build
npm start
```

### Environment Variables
Copy `.env.example` to `.env` and configure:

#### Server Configuration
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

#### Database Configuration
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`: PostgreSQL
- `MONGODB_URI`: MongoDB connection string

#### Authentication
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration time

#### OAuth Providers
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

#### Email Configuration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## 🌐 API Endpoints

### Authentication Routes
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `GET /auth/google` - Google OAuth login
- `GET /auth/facebook` - Facebook OAuth login
- `GET /auth/github` - GitHub OAuth login

### User Routes
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `POST /users/upload-avatar` - Upload user avatar

### General
- `GET /` - Welcome message
- `GET /health` - Health check endpoint

## � Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Generate test coverage
npm run test:coverage
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Joi & express-validator
- **Password Hashing**: bcryptjs
- **JWT Authentication**: Secure token-based auth
- **OAuth Integration**: Social login support

## 📊 Database Setup

### PostgreSQL (with Sequelize)
1. Install PostgreSQL
2. Create database
3. Configure connection in `.env`
4. Run migrations: `npm run migrate`

### MongoDB (with Mongoose)
1. Install MongoDB or use MongoDB Atlas
2. Configure connection string in `.env`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new features
5. Run tests: `npm test`
6. Build the project: `npm run build`
7. Commit your changes: `git commit -am 'Add feature'`
8. Push to the branch: `git push origin feature-name`
9. Submit a pull request

## 📝 Notes

- The server uses ES modules configuration
- TypeScript is configured with strict mode enabled
- Hot reload is available during development
- Follow the existing code structure and patterns
- Add appropriate tests for new features
- Update documentation when making changes
