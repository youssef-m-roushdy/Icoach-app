// src/services/subscriptionSyncService.ts
import UserSubscription from '../models/sql/UserSubscription.js';

interface SubscriptionSyncPayload {
  subscriptionId: string;
  userId: number;
  coachId: number | null;
  planType: 'AppMonthly' | 'AppYearly' | 'CoachMonthly' | 'CoachYearly';
  status: 'Trialing' | 'Active' | 'Canceled' | 'Expired' | 'PastDue';
  gateway: 'Stripe' | 'Paymob' | 'PayPal';
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string;
  autoRenew: boolean;
  canceledAt: string | null;
}

export async function syncSubscriptionFromPaymentService(
  payload: SubscriptionSyncPayload
): Promise<UserSubscription> {
  const [record] = await UserSubscription.upsert({
    subscriptionId: payload.subscriptionId,
    userId: payload.userId,
    coachId: payload.coachId,
    planType: payload.planType,
    status: payload.status,
    gateway: payload.gateway,
    currentPeriodStart: new Date(payload.currentPeriodStart),
    currentPeriodEnd: new Date(payload.currentPeriodEnd),
    autoRenew: payload.autoRenew,
    canceledAt: payload.canceledAt ? new Date(payload.canceledAt) : null,
  });

  return record;
}