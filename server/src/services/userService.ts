import { User } from '../models/index.js';
import type { UserAttributes, UserCreationAttributes } from '../models/index.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: UserCreationAttributes): Promise<UserAttributes> {
    try {
      // Check if email already exists
      const existingEmail = await User.findByEmail(userData.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }

      // Check if username already exists
      const existingUsername = await User.findByUsername(userData.username);
      if (existingUsername) {
        throw new ConflictError('Username already exists');
      }

      // Process and enhance user data with calculated/default fields
      const processedUserData = this.processUserBodyData(userData);

      // Create user with processed data
      const user = await User.create(processedUserData);
      
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await user.update({ emailVerificationToken: verificationToken });

      return user.toJSON();
    } catch (error: any) {
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError('Invalid user data', error.errors);
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<UserAttributes> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserAttributes> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<UserAttributes> {
    const user = await User.findByUsername(username);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  /**
   * Update user
   */
  static async updateUser(id: number, updateData: Partial<UserAttributes>): Promise<UserAttributes> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await User.findByEmail(updateData.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }
    }

    // Check if username is being changed and if it already exists
    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await User.findByUsername(updateData.username);
      if (existingUsername) {
        throw new ConflictError('Username already exists');
      }
    }

    try {
      await user.update(updateData);
      return user.toJSON();
    } catch (error: any) {
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError('Invalid user data', error.errors);
      }
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  static async deleteUser(id: number): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update({ isActive: false });
  }

  /**
   * Get all users (with pagination)
   */
  static async getAllUsers(page: number = 1, limit: number = 10, filters: any = {}): Promise<{
    users: UserAttributes[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const offset = (page - 1) * limit;
    const whereClause: any = { isActive: true };

    // Apply filters
    if (filters.role) whereClause.role = filters.role;
    if (filters.isEmailVerified !== undefined) whereClause.isEmailVerified = filters.isEmailVerified;

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const users = rows.map(user => user.toJSON());

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Authenticate user (login)
   */
  static async authenticateUser(emailOrUsername: string, password: string): Promise<{
    user: UserAttributes;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email or username
    let user = await User.findByEmail(emailOrUsername);
    if (!user) {
      user = await User.findByUsername(emailOrUsername);
    }

    if (!user) {
      throw new ValidationError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ValidationError('Account is deactivated');
    }

    // Compare password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new ValidationError('Invalid credentials');
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Change password
   */
  static async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Update password
    await user.update({ password: newPassword });
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<UserAttributes> {
    const user = await User.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new ValidationError('Invalid verification token');
    }

    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
    });

    return user.toJSON();
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<string> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    return resetToken;
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<UserAttributes> {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    return user.toJSON();
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(id: number, email: string, role: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'icoach-api',
      audience: 'icoach-app',
    } as SignOptions;
    
    return jwt.sign({ id, email, role }, secret, options);
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(id: number): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    
    const options: SignOptions = {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'icoach-api',
      audience: 'icoach-app',
    } as SignOptions;
    
    return jwt.sign({ id, type: 'refresh' }, secret, options);
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new ValidationError('JWT_REFRESH_SECRET is not defined');
      }
      
      const decoded = jwt.verify(refreshToken, secret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new ValidationError('Invalid token type');
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        throw new ValidationError('User not found or inactive');
      }

      const newAccessToken = this.generateAccessToken(user.id, user.email, user.role);
      const newRefreshToken = this.generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new ValidationError('Invalid refresh token');
    }
  }

  /**
   * Process user data to ensure all necessary fields are present with defaults
   */
  private static processUserBodyData(userData: any): any {
    const processedData = { ...userData };

    // Set default values for missing optional fields
    if (processedData.isActive === undefined) {
      processedData.isActive = true;
    }

    if (processedData.isEmailVerified === undefined) {
      processedData.isEmailVerified = false;
    }

    if (processedData.role === undefined) {
      processedData.role = 'user';
    }

    if (processedData.preferences === undefined) {
      processedData.preferences = {};
    }

    if (processedData.socialProfiles === undefined) {
      processedData.socialProfiles = {};
    }

    // Body/fitness related fields - set to null if not provided
    // These will be calculated by the User model if height/weight are provided
    if (processedData.bmi === undefined) {
      processedData.bmi = null;
    }

    // Optional profile fields
    if (processedData.avatar === undefined) {
      processedData.avatar = null;
    }

    if (processedData.bio === undefined) {
      processedData.bio = null;
    }

    if (processedData.phone === undefined) {
      processedData.phone = null;
    }

    if (processedData.dateOfBirth === undefined) {
      processedData.dateOfBirth = null;
    }

    if (processedData.gender === undefined) {
      processedData.gender = null;
    }

    if (processedData.height === undefined) {
      processedData.height = null;
    }

    if (processedData.weight === undefined) {
      processedData.weight = null;
    }

    if (processedData.fitnessGoal === undefined) {
      processedData.fitnessGoal = null;
    }

    if (processedData.activityLevel === undefined) {
      processedData.activityLevel = null;
    }

    if (processedData.bodyFatPercentage === undefined) {
      processedData.bodyFatPercentage = null;
    }

    // Security/system fields
    if (processedData.emailVerificationToken === undefined) {
      processedData.emailVerificationToken = null;
    }

    if (processedData.passwordResetToken === undefined) {
      processedData.passwordResetToken = null;
    }

    if (processedData.passwordResetExpires === undefined) {
      processedData.passwordResetExpires = null;
    }

    if (processedData.lastLogin === undefined) {
      processedData.lastLogin = null;
    }

    return processedData;
  }
}