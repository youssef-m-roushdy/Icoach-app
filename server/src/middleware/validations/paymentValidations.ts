import { body, param } from 'express-validator';
import { handleValidationErrors } from '../validation.js';

/**
 * Create Payment Validation
 */
export const validateCreatePayment = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Order ID must be between 1 and 100 characters'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a number greater than 0'),

  body('currency')
    .notEmpty()
    .withMessage('Currency is required')
    .isString()
    .withMessage('Currency must be a string')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code (e.g. USD, EGP)')
    .isUppercase()
    .withMessage('Currency must be uppercase (e.g. USD, EGP)'),

  body('gateway')
    .notEmpty()
    .withMessage('Gateway is required')
    .isIn(['Stripe', 'Paymob', 'PayPal'])
    .withMessage('Gateway must be Stripe, Paymob, or PayPal'),

  handleValidationErrors,
];

/**
 * Payment ID Param Validation
 * Used for GetPayment, GetPaymentStatus, and RefundPayment routes
 */
export const validatePaymentIdParam = [
  param('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isUUID()
    .withMessage('Payment ID must be a valid GUID'),

  handleValidationErrors,
];