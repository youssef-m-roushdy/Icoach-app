// SQL Models - Sequelize
import User from './User.js';
import Food from './Food.js';
import Workout from './Workout.js';
import SavedWorkout from './SavedWorkout.js';
import Injury from './Injury.js';
import FitnessPlan from './FitnessPlan.js';
import ChatHistory from './ChatHistory.js';
import WorkoutInjury from './WorkoutInjury.js';
import UserInjury from './UserInjury.js';

// Define associations
User.hasMany(SavedWorkout, { foreignKey: 'userId', as: 'savedWorkouts' });
SavedWorkout.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Workout.hasMany(SavedWorkout, { foreignKey: 'workoutId', as: 'savedBy' });
SavedWorkout.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

Workout.belongsToMany(Injury, { through: WorkoutInjury, foreignKey: 'workoutId', as: 'injuries' });
Injury.belongsToMany(Workout, { through: WorkoutInjury, foreignKey: 'injuryId', as: 'workouts' });

User.belongsToMany(Injury, { through: UserInjury, foreignKey: 'userId', as: 'injuries' });
Injury.belongsToMany(User, { through: UserInjury, foreignKey: 'injuryId', as: 'users' });

User.hasMany(FitnessPlan, { foreignKey: 'userId', as: 'plans' });
FitnessPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ChatHistory, { foreignKey: 'userId', as: 'chatHistory' });
ChatHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export all SQL models
export {
  User,
  Food,
  Workout,
  SavedWorkout,
};

// Export types
export type { UserAttributes, UserCreationAttributes, UserWithCalculatedFields } from './User.js';
export type { FoodAttributes, FoodCreationAttributes } from './Food.js';
export type { WorkoutAttributes, WorkoutCreationAttributes } from './Workout.js';
export type { SavedWorkoutAttributes, SavedWorkoutCreationAttributes } from './SavedWorkout.js';
export type { InjuryAttributes, InjuryCreationAttributes } from './Injury.js';
export type { FitnessPlanAttributes, FitnessPlanCreationAttributes } from './FitnessPlan.js';
export type { ChatHistoryAttributes, ChatHistoryCreationAttributes } from './ChatHistory.js';
export type { WorkoutInjuryAttributes, WorkoutInjuryCreationAttributes } from './WorkoutInjury.js';
export type { UserInjuryAttributes, UserInjuryCreationAttributes } from './UserInjury.js';

// Default export with all models for convenience
const sqlModels = {
  User,
  Food,
  Workout,
  SavedWorkout,
  Injury,
  FitnessPlan,
  ChatHistory,
  WorkoutInjury,
  UserInjury,
};

export default sqlModels;