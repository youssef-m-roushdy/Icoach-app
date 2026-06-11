import type { validateUpdateInjury } from './injuryValidation.js';
import type { validateUpdateExpoToken } from './notificationValidations.js';

// User validations
export {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateBodyInformation,
  validatePasswordChange,
  validatePasswordResetRequest,
  validateResendVerification,
  validatePasswordReset,
  validateIdParam,
  validateTokenParam,
  validatePagination,
  validateUserSearch,
  validateAdminCreateUser
} from './userValidation.js';

// Workout validations
export {
  validateCreateWorkout,
  validateUpdateWorkout,
  validateWorkoutQuery,
} from './workoutValidation.js';

// Food validations
export {
  validateCreateFood,
  validateUpdateFood,
  validateFoodQuery,
} from './foodValidation.js';

// Workout Session validations
export {
  validateCreateWorkoutSession,
  validateUpdateWorkoutSession,
  validateWorkoutSessionQuery,
  validateWorkoutSessionId,
  validateWorkoutSessionStats,
  validatePatchWorkoutSessionDetails,
} from './workoutSessionValidation.js';

// User Metrics validations
export {
  validateCreateUserMetrics,
  validateUpdateUserMetrics,
  validateUserMetricsQuery,
  validateUserMetricsId,
} from './userMetricsValidation.js';

// Personal Best validations
export {
  validateCreatePersonalBest,
  validateUpdatePersonalBest,
  validatePersonalBestQuery,
  validatePersonalBestId,
} from './personalBestValidation.js';

// Progress validations
export {
  validateProgressHistoryQuery,
  validateProgressDashboardQuery,
} from './progressValidation.js';

// Daily Activity validations
export {
  validateSyncDailyActivity,
  validateUpdateDailyGoal,
  validateDailyActivityHistory,
  validateWeeklySummary,
} from './dailyActivityValidation.js';

// Water Intake validations
export {
  validateSyncWaterIntake,
  validateAddWaterIntake,
  validateUpdateWaterGoal,
  validateWaterIntakeHistory,
  validateWeeklyWaterSummary,
  validateMonthlyWaterSummary,
  validateGetWaterIntakeByDate,
  validateBulkAddWaterIntake,
  validateWaterStatsQuery
} from './waterIntakeValidation.js';

// Workout Session Set validations
export {
  validateAddSetToWorkoutSession,
  validateUpdateWorkoutSessionSet,
  validateBulkUpdateSets,
  validateReorderSets,
  validateMarkSetCompleted,
  validateDeleteWorkoutSessionSet,
  validateGetWorkoutSessionSet,
  validateGetSessionSets,
  validateBulkAddSetsToWorkoutSession,
} from './workoutSessionSetValidation.js';

// Chat History validations
export {
  validateCreateMessage,
  validateChatHistoryQuery,
  validateUpdateMessage,
  validateGetMessageById,
  validateDeleteMessage,
  validateClearHistory,
  validateBatchCreateMessages,
  validateGetConversationContext,
  validateMessageIdParam,
  validateChatDateRange,
  validateSearchMessages,
  validateExportChat,
} from './chatHistoryValidations.js';

// Saved Workout validations
export {
  validateCreateSavedWorkout,
  validateGetSavedWorkouts,
  validateGetSavedWorkoutById,
  validateDeleteSavedWorkout,
  validateCheckIfSaved,
  validateBulkSavedWorkouts,
} from './savedWorkoutValidation.js';

// Conversation validations
export {
  validateCreateConversation,
  validateGetConversations,
  validateConversationIdParam,
  validateGetConversationMessages,
  validateSendConversationMessage,
  validateMarkConversationRead,
  validatePresenceQuery,
} from './conversationValidation.js';

//validations for notifications
export {
  validateRegisterExpoToken,
  validateRemoveExpoToken,
  validateUpdateExpoToken,
} from './notificationValidations.js';

export {
  validateCreateInjury,
  validateUpdateInjury,
  validateInjuryQuery,
  validateInjuryId,
  validateGetWorkoutsByInjuryId,
  validateGetInjuriesByWorkoutId,
  validateAssociateInjuryWithWorkout,
  validateDissociateInjuryFromWorkout,
  validateGetInjuryStatistics,
  validateGetInjuryFilters
} from './injuryValidation.js';

export {
  validateCreateUserInjury,
  validateDeleteUserInjury,
  validateGetUserInjuryById,
  validateCheckUserInjury,
  validateBulkCreateUserInjuries,
  validateGetUserInjuries,
  validateGetUserInjuryStatistics,
  validateGetAggravatingWorkouts,
} from './userInjuryValidation.js';

export {
  validateCreateAllergen,
  validateUpdateAllergen,
  validateAllergenQuery,
  validateGetAllergenById,
  validateDeleteAllergen,
  validateSearchAllergens,
  validateGetAllergensByCategory,
  validateGetFoodsByAllergen,
  validateGetAllergensByFood,
  validateCheckFoodAllergensForUser,
  validateBulkCreateAllergens,
} from './allergenValidation.js';

export {
  validateCreateFoodAllergen,
  validateUpdateFoodAllergen,
  validateFoodAllergenQuery,
  validateGetFoodAllergenById,
  validateDeleteFoodAllergen,
  validateBulkCreateFoodAllergens,
  validateGetRelationshipsByFood,
  validateGetRelationshipsByAllergen,
  validateToggleContains,
} from './foodAllergenValidation.js';

export {
  validateCreateUserAllergy,
  validateUpdateUserAllergy,
  validateDeleteUserAllergy,
  validateGetUserAllergyById,
  validateCheckUserAllergy,
  validateBulkCreateUserAllergies,
  validateGetUserAllergies,
  validateGetUserAllergyStatistics,
  validateGetFoodsWithUserAllergens,
} from './userAllergyValidation.js';

export {
  validateCreateNotification,
  validateGetUserNotifications,
  validateGetNotificationById,
  validateMarkAsRead,
  validateDeleteNotification,
  validateGetNotificationsByType,
  validateSendTestNotification,
  validateMarkAllAsRead,
  validateDeleteReadNotifications,
  validateGetUnreadCount,
} from './notificationValidation.js';

export {
  validateCreateWorkoutInjury,
  validateDeleteWorkoutInjury,
  validateGetWorkoutInjuryById,
  validateWorkoutInjuryQuery,
  validateGetInjuriesByWorkout,
  validateGetWorkoutsByInjury,
  validateBulkCreateWorkoutInjuries,
  validateCheckWorkoutInjuryExists,
} from './workoutInjuryValidation.js';