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