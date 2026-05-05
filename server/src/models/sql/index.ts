// SQL Models - Sequelize
import User from './User.js';
import Food from './Food.js';
import Workout from './Workout.js';
import SavedWorkout from './SavedWorkout.js';
import Injury from './Injury.js';
import FitnessPlan from './FitnessPlan.js';
import ChatHistory from './ChatHistory.js';
import ChatConversation from './ChatConversation.js';
import ChatParticipant from './ChatParticipant.js';
import ChatMessage from './ChatMessage.js';
import WorkoutInjury from './WorkoutInjury.js';
import UserInjury from './UserInjury.js';
import WorkoutSession from './WorkoutSession.js';
import UserMetrics from './UserMetrics.js';
import PersonalBest from './PersonalBest.js';
import DailyActivity from './DailyActivity.js'; // ✅ Already imported
import WaterIntake from './WaterIntake.js';
import WorkoutSessionSet from './WorkoutSessionSet.js';

// Define associations

// Existing associations...
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

// User-to-user chat associations
ChatConversation.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ChatConversation, { foreignKey: 'createdBy', as: 'createdConversations' });

ChatConversation.hasMany(ChatParticipant, { foreignKey: 'conversationId', as: 'participants' });
ChatParticipant.belongsTo(ChatConversation, { foreignKey: 'conversationId', as: 'conversation' });

ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversationId', as: 'messages' });
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(ChatParticipant, { foreignKey: 'userId', as: 'chatParticipations' });
ChatParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// ============================================
// NEW ASSOCIATIONS for WorkoutSession, UserMetrics, PersonalBest
// ============================================

// User ↔ WorkoutSession (one-to-many)
User.hasMany(WorkoutSession, { foreignKey: 'userId', as: 'workoutSessions' });
WorkoutSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Workout ↔ WorkoutSession (one-to-many)
Workout.hasMany(WorkoutSession, { foreignKey: 'workoutId', as: 'sessions' });
WorkoutSession.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

// User ↔ UserMetrics (one-to-many)
User.hasMany(UserMetrics, { foreignKey: 'userId', as: 'metricsHistory' });
UserMetrics.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ PersonalBest (one-to-many)
User.hasMany(PersonalBest, { foreignKey: 'userId', as: 'personalBests' });
PersonalBest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Workout ↔ PersonalBest (one-to-many)
Workout.hasMany(PersonalBest, { foreignKey: 'workoutId', as: 'personalBests' });
PersonalBest.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

// DailyActivity ↔ User (one-to-many)
User.hasMany(DailyActivity, { foreignKey: 'userId', as: 'activities' });
DailyActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WaterIntake model associations (if you have a WaterIntake model, you would define it similarly to DailyActivity)
 User.hasMany(WaterIntake, { foreignKey: 'userId', as: 'waterIntakes' });
 WaterIntake.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WorkoutSession -> WorkoutSessionSet (one-to-many)
WorkoutSession.hasMany(WorkoutSessionSet, {
  foreignKey: 'sessionId',
  as: 'sets',
  onDelete: 'CASCADE',
});
WorkoutSessionSet.belongsTo(WorkoutSession, {
  foreignKey: 'sessionId',
  as: 'session',
});

// Optional: WorkoutSession ↔ PersonalBest (if you want to track which session set a PB)
// This would require adding workoutSessionId to PersonalBest model first
// PersonalBest.belongsTo(WorkoutSession, { foreignKey: 'workoutSessionId', as: 'session' });
// WorkoutSession.hasOne(PersonalBest, { foreignKey: 'workoutSessionId', as: 'personalBest' });

// Export all SQL models
export {
  User,
  Food,
  Workout,
  SavedWorkout,
  Injury,
  FitnessPlan,
  ChatHistory,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  WorkoutSession,
  UserMetrics,
  PersonalBest,
  DailyActivity, 
  WorkoutInjury,
  UserInjury,
  WaterIntake,
  WorkoutSessionSet,
};

// Export types
export type { UserAttributes, UserCreationAttributes, UserWithCalculatedFields } from './User.js';
export type { FoodAttributes, FoodCreationAttributes } from './Food.js';
export type { WorkoutAttributes, WorkoutCreationAttributes } from './Workout.js';
export type { SavedWorkoutAttributes, SavedWorkoutCreationAttributes } from './SavedWorkout.js';
export type { InjuryAttributes, InjuryCreationAttributes } from './Injury.js';
export type { FitnessPlanAttributes, FitnessPlanCreationAttributes } from './FitnessPlan.js';
export type { ChatHistoryAttributes, ChatHistoryCreationAttributes } from './ChatHistory.js';
export type { ChatConversationAttributes, ChatConversationCreationAttributes } from './ChatConversation.js';
export type { ChatParticipantAttributes, ChatParticipantCreationAttributes } from './ChatParticipant.js';
export type { ChatMessageAttributes, ChatMessageCreationAttributes } from './ChatMessage.js';
export type { WorkoutInjuryAttributes, WorkoutInjuryCreationAttributes } from './WorkoutInjury.js';
export type { UserInjuryAttributes, UserInjuryCreationAttributes } from './UserInjury.js';
export type { WorkoutSessionAttributes, WorkoutSessionCreationAttributes } from './WorkoutSession.js';
export type { UserMetricsAttributes, UserMetricsCreationAttributes } from './UserMetrics.js';
export type { PersonalBestAttributes, PersonalBestCreationAttributes } from './PersonalBest.js';
export type { DailyActivityAttributes, DailyActivityCreationAttributes } from './DailyActivity.js'; 
export type { WaterIntakeAttributes, WaterIntakeCreationAttributes } from './WaterIntake.js'; 
export type { WorkoutSessionSetAttributes, WorkoutSessionSetCreationAttributes } from './WorkoutSessionSet.js';

// Default export with all models for convenience
const sqlModels = {
  User,
  Food,
  Workout,
  SavedWorkout,
  Injury,
  FitnessPlan,
  ChatHistory,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  WorkoutInjury,
  UserInjury,
  WorkoutSession,
  UserMetrics,
  PersonalBest,
  DailyActivity, 
  WaterIntake, 
  WorkoutSessionSet,
};

export default sqlModels;