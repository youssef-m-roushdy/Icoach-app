export type WorkoutDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutCategory = 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'yoga';
export type BodyPart = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full-body';

export interface Workout {
  id: string;
  name: string;
  description: string;
  category: WorkoutCategory;
  bodyPart: BodyPart;
  difficulty: WorkoutDifficulty;
  duration: number;
  calories: number;
  gifUrl?: string;
  equipment?: string[];
  instructions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutDto {
  name: string;
  description: string;
  category: WorkoutCategory;
  bodyPart: BodyPart;
  difficulty: WorkoutDifficulty;
  duration: number;
  calories: number;
  equipment?: string[];
  instructions?: string[];
  gif?: File;
}

export type UpdateWorkoutDto = Partial<CreateWorkoutDto>;

export interface WorkoutFilters {
  categories: WorkoutCategory[];
  bodyParts: BodyPart[];
  difficulties: WorkoutDifficulty[];
}