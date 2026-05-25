export interface Workout {
  id: number;
  body_part: string;
  target_area: string;
  name: string;
  equipment: string;
  level: string;
  description?: string;
  gif_link?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutDto {
  body_part: string;
  target_area: string;
  name: string;
  equipment: string;
  level: string;
  description?: string;
  gif_link?: File;
}

export type UpdateWorkoutDto = Partial<CreateWorkoutDto>;