import { User } from '../models/index.js';
import type { UserAttributes, UserCreationAttributes, UserWithCalculatedFields } from '../models/index.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { EmailService } from './emailService.js';
import { jwtConfig } from '../config/jwt.js';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: UserCreationAttributes): Promise<UserWithCalculatedFields> {
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

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          user.email,
          user.firstName,
          verificationToken
        );
        console.log(`📧 Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail user creation if email fails
      }

      // Return user with calculated fields
      const userJson = user.toJSON();
      return {
        ...userJson,
        bmi: user.calculateBMI(),
        bmiCategory: user.getBMICategory(),
        recommendedCalories: user.calculateRecommendedCalories(),
        recommendedWaterIntake: user.calculateBodyRecommnendedWaterIntake(),
        profileCompleteness: user.getFitnessProfileCompleteness(),
      };
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
  static async getUserById(id: number): Promise<UserWithCalculatedFields> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    const userData = user.toJSON();
    
    // Add calculated metrics
    return {
      ...userData,
      bmi: user.calculateBMI(),
      bmiCategory: user.getBMICategory(),
      recommendedCalories: user.calculateRecommendedCalories(),
      recommendedWaterIntake: user.calculateBodyRecommnendedWaterIntake(),
      profileCompleteness: user.getFitnessProfileCompleteness(),
    };
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
   * Update user body information and fitness profile
   */
  static async updateBodyInformation(id: number, bodyData: {
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: Date;
    height?: number;
    weight?: number;
    fitnessGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
    activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
    bodyFatPercentage?: number;
  }): Promise<UserWithCalculatedFields> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    try {
      // Convert string date to Date if needed
      const updateData: any = { ...bodyData };
      if (bodyData.dateOfBirth && typeof bodyData.dateOfBirth === 'string') {
        updateData.dateOfBirth = new Date(bodyData.dateOfBirth);
      }

      // Update body information
      await user.update(updateData);
      
      // Return user with calculated fields
      const updatedUser = user.toJSON();
      
      // Add calculated metrics
      return {
        ...updatedUser,
        bmi: user.calculateBMI(),
        bmiCategory: user.getBMICategory(),
        recommendedCalories: user.calculateRecommendedCalories(),
        recommendedWaterIntake: user.calculateBodyRecommnendedWaterIntake(),
        profileCompleteness: user.getFitnessProfileCompleteness(),
      };
    } catch (error: any) {
      if (error.name === 'SequelizeValidationError') {
        throw new ValidationError('Invalid body data', error.errors);
      }
      throw error;
    }
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
    user: UserWithCalculatedFields;
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

    // Return user with calculated fields
    const userJson = user.toJSON();
    return {
      user: {
        ...userJson,
        bmi: user.calculateBMI(),
        bmiCategory: user.getBMICategory(),
        recommendedCalories: user.calculateRecommendedCalories(),
        recommendedWaterIntake: user.calculateBodyRecommnendedWaterIntake(),
        profileCompleteness: user.getFitnessProfileCompleteness(),
      },
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

    // Send password changed confirmation email
    try {
      await EmailService.sendPasswordChangedEmail(user.email, user.firstName);
      console.log(`📧 Password changed confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't fail password change if email fails
    }
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

    // Emit real-time notification to connected user
    try {
      const { socketService } = await import('./socketService.js');
      const emitData = {
        id: user.id.toString(),
        email: user.email,
        isEmailVerified: true,
        firstName: user.firstName,
      };
      console.log('📧 [EMAIL VERIFICATION] Preparing to emit socket event...');
      console.log('📧 [EMAIL VERIFICATION] User ID:', user.id.toString());
      console.log('📧 [EMAIL VERIFICATION] Emit data:', JSON.stringify(emitData, null, 2));
      
      const emitResult = socketService.emitEmailVerified(user.id.toString(), emitData);
      console.log('📧 [EMAIL VERIFICATION] Socket emit result:', emitResult ? 'SUCCESS - User received the event' : 'FAILED - User not connected');
    } catch (socketError) {
      console.error('❌ [EMAIL VERIFICATION] Failed to emit socket event:', socketError);
      // Don't fail verification if socket emit fails
    }

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user.email, user.firstName);
      console.log(`📧 Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    return user.toJSON();
  }

  /**
   * Resend email verification
   */
  static async resendVerificationEmail(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await user.update({ emailVerificationToken: verificationToken });

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
      console.log(`📧 Verification email resent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      throw new Error('Failed to send verification email. Please try again later.');
    }
  }

  /**
   * Validate password reset token (for rendering the form)
   * UPDATED: Now uses hashed token comparison
   */
  static async validatePasswordResetToken(token: string): Promise<boolean> {
    try {
      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const user = await User.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: {
            [Op.gt]: new Date(), // Token must not be expired
          },
        },
      });

      return !!user; // Return true if user found, false otherwise
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Request password reset
   * UPDATED: Now hashes token before storing in DB
   */
  static async requestPasswordReset(email: string): Promise<string> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate random token (plain text - this will be sent in email)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing in database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiration time (1 hour from now)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save hashed token and expiration to database
    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: resetExpires,
    });

    // Send password reset email with plain token
    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken // Send plain token (not hashed)
      );
      console.log(`📧 Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      throw new Error('Failed to send password reset email. Please try again later.');
    }

    // Return plain token (for development testing only)
    return resetToken;
  }

  /**
   * Reset password
   * UPDATED: Now hashes token before comparison
   */
  static async resetPassword(token: string, newPassword: string): Promise<UserAttributes> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          [Op.gt]: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Update password and clear reset token fields
    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Send password changed confirmation email
    try {
      await EmailService.sendPasswordChangedEmail(user.email, user.firstName);
      console.log(`📧 Password changed confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't fail password reset if email fails
    }

    return user.toJSON();
  }

  /**
   * Generate access token
   */
  static generateAccessToken(id: number, email: string, role: string): string {
    const secret = jwtConfig.secret;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    const options: SignOptions = {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    } as SignOptions;
    
    return jwt.sign({ id, email, role }, secret, options);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(id: number): string {
    const secret = jwtConfig.refreshSecret;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    
    const options: SignOptions = {
      expiresIn: jwtConfig.refreshExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
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
      const secret = jwtConfig.refreshSecret;
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
   * Handle Google OAuth login/signup
   */
  static async handleGoogleOAuth(user: UserAttributes): Promise<{
    user: UserAttributes;
    accessToken: string;
    refreshToken: string;
  }> {
    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user,
      accessToken,
      refreshToken,
    };
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

    // Set default auth provider to 'regular' for manual registration
    if (processedData.authProvider === undefined) {
      processedData.authProvider = 'regular';
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