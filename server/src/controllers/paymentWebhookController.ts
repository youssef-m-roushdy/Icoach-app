// src/controllers/paymentWebhookController.ts
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { syncSubscriptionFromPaymentService } from '../services/subscriptionSyncService.js';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET!;

function verifySignature(rawBody: string, signatureHeader?: string): boolean {
  if (!signatureHeader || !rawBody) return false;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function handleSubscriptionWebhook(req: Request, res: Response) {
  const signature = req.headers['x-payment-signature'] as string | undefined;

  if (!verifySignature((req as any).rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  try {
    await syncSubscriptionFromPaymentService(req.body);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Failed to sync subscription webhook:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}

export async function handlePaymentWebhook(req: Request, res: Response) {
  const signature = req.headers['x-payment-signature'] as string | undefined;

  if (!verifySignature((req as any).rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  try {
    // TODO: هنضيف syncPaymentFromPaymentService لو محتاج تتبع أوردرز المنتجات هنا
    console.log('Payment webhook received:', req.body);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Failed to process payment webhook:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}