import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/database.js';

// User attributes interface
interface UserAttributes {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  avatar?: string | null;
  bio?: string;
  dateOfBirth?: Date;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number; // in cm
  weight?: number; // in kg
  fitnessGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  bodyFatPercentage?: number;
  bmi?: number;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  role: 'user' | 'coach' | 'admin';
  authProvider: 'regular' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'avatar'
    | 'bio'
    | 'dateOfBirth'
    | 'phone'
    | 'gender'
    | 'height'
    | 'weight'
    | 'fitnessGoal'
    | 'activityLevel'
    | 'bodyFatPercentage'
    | 'bmi'
    | 'isActive'
    | 'isEmailVerified'
    | 'emailVerificationToken'
    | 'passwordResetToken'
    | 'passwordResetExpires'
    | 'lastLogin'
    | 'authProvider'
    | 'createdAt'
    | 'updatedAt'
  > {}

// User model class
class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  // Attributes
  declare id: CreationOptional<number>;
  declare email: string;
  declare username: string;
  declare firstName: string;
  declare lastName: string;
  declare password: string | null; // Null for OAuth users
  declare avatar: string | null;
  declare bio: string | null;
  declare dateOfBirth: Date | null;
  declare phone: string | null;
  declare gender: 'male' | 'female' | 'other' | null;
  declare height: number | null; // in cm
  declare weight: number | null; // in kg
  declare fitnessGoal: 'weight_loss' | 'muscle_gain' | 'maintenance' | null;
  declare activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | null;
  declare bodyFatPercentage: number | null;
  declare bmi: number | null;
  declare isActive: CreationOptional<boolean>;
  declare isEmailVerified: CreationOptional<boolean>;
  declare emailVerificationToken: string | null;
  declare passwordResetToken: string | null;
  declare passwordResetExpires: Date | null;
  declare lastLogin: Date | null;
  declare role: CreationOptional<'user' | 'coach' | 'admin'>;
  declare authProvider: CreationOptional<'regular' | 'google'>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Instance methods
  async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) {
      return false; // OAuth users don't have passwords
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON(): any {
    const values = Object.assign({}, this.get()) as any;
    delete values.password;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    return values;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Calculate and update BMI based on height and weight
  calculateBMI(): number | null {
    if (!this.height || !this.weight) {
      return null;
    }
    
    // BMI = weight (kg) / (height (m))^2
    const heightInMeters = this.height / 100;
    const bmi = this.weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 100) / 100; // Round to 2 decimal places
  }

  // Get BMI category
  getBMICategory(): string | null {
    const bmi = this.bmi || this.calculateBMI();
    if (!bmi) return null;

    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  // Calculate recommended daily calories (Harris-Benedict equation)
  calculateRecommendedCalories(): number | null {
    if (!this.height || !this.weight || !this.dateOfBirth || !this.gender || !this.activityLevel) {
      return null;
    }

    // Ensure dateOfBirth is a Date object
    const birthDate = this.dateOfBirth instanceof Date ? this.dateOfBirth : new Date(this.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    let bmr: number;

    // Calculate BMR (Basal Metabolic Rate)
    if (this.gender === 'male') {
      bmr = 88.362 + (13.397 * this.weight) + (4.799 * this.height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * this.weight) + (3.098 * this.height) - (4.330 * age);
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
    };

    const dailyCalories = bmr * activityMultipliers[this.activityLevel];
    return Math.round(dailyCalories);
  }

  calculateBodyRecommnendedWaterIntake(): number | null {
    if (!this.weight) {
      return null;
    }
    // General recommendation: 35 ml per kg of body weight
    const waterIntakeLiters = (this.weight * 35) / 1000;
    return Math.round(waterIntakeLiters * 100) / 100; // Round to 2 decimal places
  }

  // Get fitness profile completeness percentage
  getFitnessProfileCompleteness(): number {
    const fitnessFields = [
      'gender', 'height', 'weight', 'dateOfBirth', 
      'fitnessGoal', 'activityLevel', 'bodyFatPercentage'
    ];
    
    const completedFields = fitnessFields.filter(field => this[field as keyof User] != null);
    return Math.round((completedFields.length / fitnessFields.length) * 100);
  }

  // Static methods
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  static async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username: username.toLowerCase() } });
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
        len: {
          args: [3, 255],
          msg: 'Email must be between 3 and 255 characters',
        },
      },
      set(value: string) {
        this.setDataValue('email', value.toLowerCase().trim());
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 50],
          msg: 'Username must be between 3 and 50 characters',
        },
        is: {
          args: /^[a-zA-Z0-9_-]+$/,
          msg: 'Username can only contain letters, numbers, underscores, and hyphens',
        },
      },
      set(value: string) {
        this.setDataValue('username', value.toLowerCase().trim());
      },
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [1, 50],
          msg: 'First name must be between 1 and 50 characters',
        },
        notEmpty: {
          msg: 'First name is required',
        },
      },
      set(value: string) {
        this.setDataValue('firstName', value.trim());
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [1, 50],
          msg: 'Last name must be between 1 and 50 characters',
        },
        notEmpty: {
          msg: 'Last name is required',
        },
      },
      set(value: string) {
        this.setDataValue('lastName', value.trim());
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true, // Allow null for OAuth users
      validate: {
        len: {
          args: [8, 128],
          msg: 'Password must be between 8 and 128 characters',
        },
        is: {
          args: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          msg: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        },
      },
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Avatar must be a valid URL',
        },
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'Bio must be less than 1000 characters',
        },
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: {
          args: true,
          msg: 'Date of birth must be a valid date',
        },
        isBefore: {
          args: new Date().toISOString().split('T')[0]!,
          msg: 'Date of birth must be in the past',
        },
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^\+?[1-9]\d{1,14}$/,
          msg: 'Phone number must be a valid international format',
        },
      },
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['male', 'female', 'other']],
          msg: 'Gender must be male, female, or other',
        },
      },
    },
    height: {
      type: DataTypes.DECIMAL(5, 2), // e.g., 180.50 cm
      allowNull: true,
      validate: {
        min: {
          args: [50],
          msg: 'Height must be at least 50 cm',
        },
        max: {
          args: [300],
          msg: 'Height must be less than 300 cm',
        },
      },
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2), // e.g., 75.50 kg
      allowNull: true,
      validate: {
        min: {
          args: [20],
          msg: 'Weight must be at least 20 kg',
        },
        max: {
          args: [500],
          msg: 'Weight must be less than 500 kg',
        },
      },
    },
    fitnessGoal: {
      type: DataTypes.ENUM('weight_loss', 'muscle_gain', 'maintenance'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['weight_loss', 'muscle_gain', 'maintenance']],
          msg: 'Fitness goal must be weight_loss, muscle_gain, or maintenance',
        },
      },
    },
    activityLevel: {
      type: DataTypes.ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['sedentary', 'lightly_active', 'moderately_active', 'very_active']],
          msg: 'Activity level must be sedentary, lightly_active, moderately_active, or very_active',
        },
      },
    },
    bodyFatPercentage: {
      type: DataTypes.DECIMAL(5, 2), // e.g., 15.50%
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Body fat percentage must be at least 0%',
        },
        max: {
          args: [100],
          msg: 'Body fat percentage must be less than 100%',
        },
      },
    },
    bmi: {
      type: DataTypes.DECIMAL(5, 2), // e.g., 24.50
      allowNull: true,
      validate: {
        min: {
          args: [10],
          msg: 'BMI must be at least 10',
        },
        max: {
          args: [50],
          msg: 'BMI must be less than 50',
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'coach', 'admin'),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'coach', 'admin']],
          msg: 'Role must be user, coach, or admin',
        },
      },
    },
    authProvider: {
      type: DataTypes.ENUM('regular', 'google'),
      allowNull: false,
      defaultValue: 'regular',
      validate: {
        isIn: {
          args: [['regular', 'google']],
          msg: 'Auth provider must be regular or google',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    paranoid: false, // Set to true if you want soft deletes
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['username'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await User.hashPassword(user.password);
        }
        // Auto-calculate BMI if height and weight are provided
        if (user.height && user.weight) {
          user.bmi = user.calculateBMI();
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password') && user.password) {
          user.password = await User.hashPassword(user.password);
        }
        // Auto-calculate BMI if height or weight changed
        if (user.changed('height') || user.changed('weight')) {
          if (user.height && user.weight) {
            user.bmi = user.calculateBMI();
          } else {
            user.bmi = null;
          }
        }
      },
    },
  }
);

// Extended user response with calculated fields
export interface UserWithCalculatedFields extends Omit<UserAttributes, 'password'> {
  bmiCategory: string | null;
  recommendedCalories: number | null;
  recommendedWaterIntake: number | null;
  profileCompleteness: number;
}

export default User;
export type { UserAttributes, UserCreationAttributes };