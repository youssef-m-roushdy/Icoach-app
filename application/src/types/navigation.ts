export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  Login: undefined;
  MainDrawer: undefined;
  Onboarding: undefined;
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EditBodyInfo: undefined;
  Foods: undefined;
  AuthCallback: {
    token: string;
    refreshToken?: string;
    user: string;
  };
};

export type DrawerParamList = {
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EditBodyInfo: undefined;
  Foods: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  Login: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EditBodyInfo: undefined;
  Foods: undefined;
  Onboarding: undefined;
};

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  fitnessGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  activityLevel?:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active';
  bodyFatPercentage?: number;
  bio?: string;
  phone?: string;
  avatar?: string;
  photoURL?: string;
  bmi?: number;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  authProvider?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}
