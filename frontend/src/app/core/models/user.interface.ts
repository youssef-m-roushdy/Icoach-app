export type UserRole = 'user' | 'admin' | 'coach';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface AdminProfile extends User {
  bio?: string;
  phone?: string;
}