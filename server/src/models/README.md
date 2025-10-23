# User Models Documentation

This project includes a comprehensive user model for PostgreSQL using Sequelize ORM. MongoDB is used separately for logging and AI data only.

## Overview

The user model system provides:
- **PostgreSQL with Sequelize**: Primary database for user data
- **Type safety**: Full TypeScript support
- **Security**: Password hashing, validation, account protection
- **Flexibility**: Customizable preferences and social profiles
- **Authentication ready**: JWT integration, OAuth support

## Database Architecture

- **PostgreSQL**: All user data, authentication, profiles
- **MongoDB**: Logging, AI interactions, analytics (separate from user models)

## Directory Structure

```
src/models/
├── index.ts           # Main models index
├── sql/
│   ├── index.ts       # SQL models index  
│   └── User.ts        # Sequelize User model
└── README.md          # This documentation
```

Note: MongoDB connection exists for logging/AI but no user models in MongoDB.

## User Attributes

### Core Fields
- `id`/`_id`: Primary key
- `email`: Unique, validated email address
- `username`: Unique username (3-50 chars)
- `firstName`: User's first name
- `lastName`: User's last name
- `password`: Hashed password (min 8 chars, complexity requirements)

### Profile Fields
- `avatar`: Profile picture URL
- `bio`: User biography (max 1000 chars)
- `dateOfBirth`: Birth date
- `phone`: International phone number

### Security Fields
- `isActive`: Account status
- `isEmailVerified`: Email verification status
- `emailVerificationToken`: Token for email verification
- `passwordResetToken`: Token for password reset
- `passwordResetExpires`: Password reset expiration
- `lastLogin`: Last login timestamp
- `loginAttempts`: Failed login attempts (Mongoose only)
- `lockUntil`: Account lock expiration (Mongoose only)

### System Fields
- `role`: User role (`user`, `coach`, `admin`)
- `preferences`: JSON object for user preferences
- `socialProfiles`: OAuth profile data
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Usage Examples

### User Model (Sequelize/PostgreSQL)

```typescript
import { User } from '../models/index.js';

// Create a new user
const user = await User.create({
  email: 'user@example.com',
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  password: 'SecurePass123!',
});

// Find user by email
const user = await User.findByEmail('user@example.com');

// Compare password
const isValid = await user.comparePassword('SecurePass123!');

// Get full name
const fullName = user.getFullName();

// Update user
await user.update({ bio: 'Updated bio' });
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- At least one special character (@$!%*?&)

### Account Security
- Automatic password hashing (bcrypt with 12 rounds)
- Password reset tokens with expiration
- Email verification system
- SQL-level constraints and validation

### Data Privacy
- Passwords excluded from JSON serialization
- Sensitive tokens hidden in queries
- Configurable field visibility

## Validation Rules

### Email
- Valid email format
- Unique across users
- Automatically normalized (lowercase, trimmed)

### Username
- 3-50 characters
- Letters, numbers, underscores, hyphens only
- Unique across users
- Automatically normalized (lowercase, trimmed)

### Names
- 1-50 characters each
- Required fields
- Automatically trimmed

### Phone
- International format validation
- Optional field

## Database Setup

### PostgreSQL (Primary Database)
1. Create database: `createdb icoach_db`
2. Update `.env` with database credentials
3. Models auto-sync in development mode

### MongoDB (Logging/AI Only)
1. Start MongoDB service
2. Update `.env` with MongoDB URI (for logs)
3. No user models - used for application logs and AI data

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database URLs
POSTGRES_DB=icoach_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
MONGODB_URI=mongodb://localhost:27017/icoach_logs

# Security
JWT_SECRET=your-secret-key
```

## Adding New Fields

### Sequelize User Model
1. Add field to `UserAttributes` interface
2. Add field to model definition with validation
3. Update `UserCreationAttributes` if optional
4. Run migration in production

## Best Practices

1. **Use transactions** for multi-model operations
2. **Validate input** before model operations
3. **Hash passwords** before storage (automatic in hooks)
4. **Exclude sensitive fields** from API responses
5. **Use indexes** for frequently queried fields
6. **Handle validation errors** gracefully

## Testing

```bash
# Run with test database
NODE_ENV=test npm run dev

# Test user creation
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","username":"testuser","firstName":"Test","lastName":"User","password":"SecurePass123!"}'
```

## Architecture Notes

- **User Data**: PostgreSQL only (scalable, ACID compliant, relational)
- **Logging/AI Data**: MongoDB (flexible document storage for logs and AI interactions)
- **Clean Separation**: Each database serves its specific purpose
- **Performance**: Optimized for each use case