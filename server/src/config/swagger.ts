import swaggerJsdoc from 'swagger-jsdoc';
import { type Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'iCoach API',
      version: '1.0.0',
      description: 'A comprehensive fitness coaching platform API with user management, authentication, and body tracking features.',
      contact: {
        name: 'API Support',
        email: 'support@icoach.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.icoach.com/api/v1' 
          : 'http://localhost:3000/api/v1',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the user',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            username: {
              type: 'string',
              description: 'Unique username',
              example: 'johndoe'
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe'
            },
            avatar: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: 'Profile picture URL',
              example: 'https://example.com/avatar.jpg'
            },
            bio: {
              type: 'string',
              nullable: true,
              description: 'User bio/description',
              example: 'Fitness enthusiast and personal trainer'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Date of birth',
              example: '1990-01-01'
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Phone number in international format',
              example: '+1234567890'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              nullable: true,
              description: 'User gender',
              example: 'male'
            },
            height: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Height in centimeters',
              minimum: 50,
              maximum: 300,
              example: 180.5
            },
            weight: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Weight in kilograms',
              minimum: 20,
              maximum: 500,
              example: 75.2
            },
            fitnessGoal: {
              type: 'string',
              enum: ['weight_loss', 'muscle_gain', 'maintenance'],
              nullable: true,
              description: 'User fitness goal',
              example: 'muscle_gain'
            },
            activityLevel: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
              nullable: true,
              description: 'User activity level',
              example: 'moderately_active'
            },
            bodyFatPercentage: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Body fat percentage',
              minimum: 0,
              maximum: 100,
              example: 15.5
            },
            bmi: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Body Mass Index (calculated automatically)',
              example: 23.2
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
              example: true
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Whether the email is verified',
              example: false
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp',
              example: '2024-01-01T12:00:00Z'
            },
            role: {
              type: 'string',
              enum: ['user', 'coach', 'admin'],
              description: 'User role',
              example: 'user'
            },
            preferences: {
              type: 'object',
              nullable: true,
              description: 'User preferences (JSON object)',
              example: { theme: 'dark', notifications: true }
            },
            socialProfiles: {
              type: 'object',
              nullable: true,
              description: 'Social media profiles (JSON object)',
              example: { instagram: '@johndoe', twitter: '@johndoe' }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-01T12:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-01T12:00:00Z'
            }
          },
          required: ['id', 'email', 'username', 'firstName', 'lastName', 'isActive', 'isEmailVerified', 'role', 'createdAt', 'updatedAt']
        },
        UserRegistration: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            username: {
              type: 'string',
              description: 'Unique username (3-50 characters)',
              minLength: 3,
              maxLength: 50,
              example: 'johndoe'
            },
            firstName: {
              type: 'string',
              description: 'User first name (1-50 characters)',
              minLength: 1,
              maxLength: 50,
              example: 'John'
            },
            lastName: {
              type: 'string',
              description: 'User last name (1-50 characters)',
              minLength: 1,
              maxLength: 50,
              example: 'Doe'
            },
            password: {
              type: 'string',
              description: 'Password (8-128 characters, must contain uppercase, lowercase, number, and special character)',
              minLength: 8,
              maxLength: 128,
              example: 'SecurePass123!'
            },
            avatar: {
              type: 'string',
              format: 'url',
              description: 'Profile picture URL (optional)',
              example: 'https://example.com/avatar.jpg'
            },
            bio: {
              type: 'string',
              maxLength: 1000,
              description: 'User bio/description (optional)',
              example: 'Fitness enthusiast'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth (optional)',
              example: '1990-01-01'
            },
            phone: {
              type: 'string',
              description: 'Phone number in international format (optional)',
              example: '+1234567890'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'User gender (optional)',
              example: 'male'
            },
            height: {
              type: 'number',
              format: 'float',
              minimum: 50,
              maximum: 300,
              description: 'Height in centimeters (optional)',
              example: 180.5
            },
            weight: {
              type: 'number',
              format: 'float',
              minimum: 20,
              maximum: 500,
              description: 'Weight in kilograms (optional)',
              example: 75.2
            },
            fitnessGoal: {
              type: 'string',
              enum: ['weight_loss', 'muscle_gain', 'maintenance'],
              description: 'User fitness goal (optional)',
              example: 'muscle_gain'
            },
            activityLevel: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
              description: 'User activity level (optional)',
              example: 'moderately_active'
            },
            bodyFatPercentage: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 100,
              description: 'Body fat percentage (optional)',
              example: 15.5
            }
          },
          required: ['email', 'username', 'firstName', 'lastName', 'password']
        },
        UserLogin: {
          type: 'object',
          properties: {
            emailOrUsername: {
              type: 'string',
              description: 'Email address or username',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePass123!'
            }
          },
          required: ['emailOrUsername', 'password']
        },
        UserUpdate: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'User first name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'User last name',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'newemail@example.com'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Unique username',
              example: 'newusername'
            },
            avatar: {
              type: 'string',
              format: 'url',
              description: 'Profile picture URL',
              example: 'https://example.com/new-avatar.jpg'
            },
            bio: {
              type: 'string',
              maxLength: 1000,
              description: 'User bio/description',
              example: 'Updated bio'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
              example: '1990-01-01'
            },
            phone: {
              type: 'string',
              description: 'Phone number in international format',
              example: '+1234567890'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'User gender',
              example: 'male'
            },
            height: {
              type: 'number',
              format: 'float',
              minimum: 50,
              maximum: 300,
              description: 'Height in centimeters',
              example: 182.0
            },
            weight: {
              type: 'number',
              format: 'float',
              minimum: 20,
              maximum: 500,
              description: 'Weight in kilograms',
              example: 78.5
            },
            fitnessGoal: {
              type: 'string',
              enum: ['weight_loss', 'muscle_gain', 'maintenance'],
              description: 'User fitness goal',
              example: 'maintenance'
            },
            activityLevel: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
              description: 'User activity level',
              example: 'very_active'
            },
            bodyFatPercentage: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 100,
              description: 'Body fat percentage',
              example: 12.3
            },
            preferences: {
              type: 'object',
              description: 'User preferences (JSON object)',
              example: { theme: 'light', notifications: false }
            },
            socialProfiles: {
              type: 'object',
              description: 'Social media profiles (JSON object)',
              example: { linkedin: 'johndoe', github: 'johndoe' }
            }
          }
        },
        ChangePassword: {
          type: 'object',
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password',
              example: 'OldPassword123!'
            },
            newPassword: {
              type: 'string',
              description: 'New password (8-128 characters, must contain uppercase, lowercase, number, and special character)',
              minLength: 8,
              maxLength: 128,
              example: 'NewSecurePass123!'
            }
          },
          required: ['currentPassword', 'newPassword']
        },
        PasswordReset: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Password reset token',
              example: 'abc123def456'
            },
            newPassword: {
              type: 'string',
              description: 'New password',
              minLength: 8,
              maxLength: 128,
              example: 'NewSecurePass123!'
            }
          },
          required: ['token', 'newPassword']
        },
        PasswordResetRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address for password reset',
              example: 'user@example.com'
            }
          },
          required: ['email']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'JWT access token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
              example: true
            },
            message: {
              type: 'string',
              description: 'Human readable message',
              example: 'Operation completed successfully'
            },
            data: {
              description: 'Response data (varies by endpoint)'
            }
          },
          required: ['success', 'message']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'An error occurred'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  example: ['Email is required', 'Password must be at least 8 characters']
                }
              }
            }
          },
          required: ['success', 'message']
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Users retrieved successfully'
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 25
                },
                pages: {
                  type: 'integer',
                  example: 3
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',  // Path to the API routes
    './src/controllers/*.ts', // Path to controllers if needed
  ],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'iCoach API Documentation',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true
    }
  }));

  // Raw JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
  console.log('📄 Raw OpenAPI spec available at /api-docs.json');
};

export { specs };