import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'protos', 'payment.proto');
const PAYMENT_SERVICE_GRPC_URL = process.env.PAYMENT_SERVICE_GRPC_URL || 'localhost:5001';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition) as any;

const client = new paymentProto.payments.PaymentGrpcService(
  PAYMENT_SERVICE_GRPC_URL,
  grpc.credentials.createInsecure()
);

// ---- Service-to-service auth ----
// Reuses the same RS256 access-token key pair already used for user auth,
// since PaymentService validates against the same public key (keys/public.pem).
const SERVICE_JWT_PRIVATE_KEY = fs.readFileSync(
  path.resolve(process.env.JWT_ACCESS_PRIVATE_KEY_PATH || './keys/private.pem'),
  'utf8'
);
const SERVICE_JWT_ISSUER = process.env.JWT_ISSUER!;
const SERVICE_JWT_AUDIENCE = process.env.JWT_AUDIENCE!;

function buildServiceToken(): string {
  return jwt.sign(
    { sub: 'main-server', role: 'service' },
    SERVICE_JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      issuer: SERVICE_JWT_ISSUER,
      audience: SERVICE_JWT_AUDIENCE,
      expiresIn: '5m',
    }
  );
}

function buildMetadata(): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.add('Authorization', `Bearer ${buildServiceToken()}`);
  return metadata;
}

// Per-call deadline so a hung PaymentService can't block the Node.js request pool indefinitely.
function callOptions(): grpc.CallOptions {
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 10);
  return { deadline };
}

// ---- Typed response shapes ----
export interface CreateSubscriptionResult {
  subscriptionId: string;
  checkoutUrl: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

export interface SubscriptionStatusResult {
  isActive: boolean;
  planType: string;
  currentPeriodEnd: string;
  coachId: number;
}

export interface PaymentDetailsResult {
  paymentId: string;
  userId: number;
  orderId: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  externalPaymentId: string;
  checkoutUrl: string;
  createdAt: string;
  completedAt: string;
}

// ---- Public client functions ----

export function createSubscription(params: {
  userId: number;
  planType: 'AppMonthly' | 'AppYearly' | 'CoachMonthly' | 'CoachYearly';
  gateway: 'Stripe' | 'Paymob' | 'PayPal';
  coachId?: number | null;
  idempotencyKey: string;
}): Promise<CreateSubscriptionResult> {
  return new Promise((resolve, reject) => {
    client.CreateSubscription(
      {
        userId: params.userId,
        planType: params.planType,
        gateway: params.gateway,
        coachId: params.coachId ?? 0,
        idempotencyKey: params.idempotencyKey,
      },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: CreateSubscriptionResult) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function createPayment(params: {
  userId: number;
  orderId: string;
  amount: number;
  currency: string;
  gateway: 'Stripe' | 'Paymob' | 'PayPal';
  idempotencyKey: string;
}): Promise<CreatePaymentResult> {
  return new Promise((resolve, reject) => {
    client.CreatePayment(
      {
        userId: params.userId,
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency,
        gateway: params.gateway,
        idempotencyKey: params.idempotencyKey,
      },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: CreatePaymentResult) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
  return new Promise((resolve, reject) => {
    client.CancelSubscription(
      { subscriptionId },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: { success: boolean; status: string }) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function getSubscriptionStatus(userId: number): Promise<SubscriptionStatusResult> {
  return new Promise((resolve, reject) => {
    client.GetSubscriptionStatus(
      { userId },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: SubscriptionStatusResult) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function getPayment(paymentId: string): Promise<PaymentDetailsResult> {
  return new Promise((resolve, reject) => {
    client.GetPayment(
      { paymentId },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: PaymentDetailsResult) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function getPaymentStatus(paymentId: string): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    client.GetPaymentStatus(
      { paymentId },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: { status: string }) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

export function refundPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    client.RefundPayment(
      { paymentId },
      buildMetadata(),
      callOptions(),
      (err: grpc.ServiceError | null, response: { success: boolean; message: string }) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}