import { body, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Subscription Validation
 */
export const validateCreateSubscription = [
  body('planType')
    .notEmpty()
    .withMessage('Plan type is required')
    .isIn(['AppMonthly', 'AppYearly', 'CoachMonthly', 'CoachYearly'])
    .withMessage('Plan type must be AppMonthly, AppYearly, CoachMonthly, or CoachYearly'),

  body('gateway')
    .notEmpty()
    .withMessage('Gateway is required')
    .isIn(['Stripe', 'Paymob', 'PayPal'])
    .withMessage('Gateway must be Stripe, Paymob, or PayPal'),

  body('coachId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Coach ID must be a positive integer'),

  body('coachId').custom((value, { req }) => {
    const planType = req.body.planType;
    const isCoachPlan = planType === 'CoachMonthly' || planType === 'CoachYearly';

    if (isCoachPlan && !value) {
      throw new Error('Coach ID is required when subscribing to a CoachMonthly or CoachYearly plan');
    }

    if (!isCoachPlan && value) {
      throw new Error('Coach ID must not be provided for AppMonthly or AppYearly plans');
    }

    return true;
  }),

  handleValidationErrors,
];

/**
 * Cancel Subscription Validation
 */
export const validateCancelSubscription = [
  param('subscriptionId')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isUUID()
    .withMessage('Subscription ID must be a valid GUID'),

  handleValidationErrors,
];