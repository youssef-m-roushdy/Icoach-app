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

export {
  validateProgressHistoryQuery,
  validateProgressDashboardQuery,
} from './progressValidation.js';

export {
  validateSyncDailyActivity,
  validateUpdateDailyGoal,
  validateDailyActivityHistory,
  validateWeeklySummary,
} from './dailyActivityValidation.js';

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