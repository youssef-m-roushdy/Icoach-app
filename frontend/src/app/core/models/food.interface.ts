export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  category: string;
  imageUrl?: string;
  servingSize?: number;
  servingUnit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodDto {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  category: string;
  servingSize?: number;
  servingUnit?: string;
  image?: File;
}

export type UpdateFoodDto = Partial<CreateFoodDto>;