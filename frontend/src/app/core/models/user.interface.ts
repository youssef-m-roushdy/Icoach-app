export type UserRole = 'user' | 'admin' | 'coach' | 'trainer';
export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'muscle_gain' | 'weight_loss' | 'endurance' | 'flexibility' | 'general_fitness';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  fitnessGoal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  bodyFatPercentage?: number;
  bmi?: number;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  fitnessGoal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface AdminProfile extends User {
  // Admin specific fields can be added here
}

// Helper function to get full name
export function getFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

// Helper function to get display name
export function getDisplayName(user: User): string {
  return user.firstName ? `${user.firstName} ${user.lastName}` : user.username;
}