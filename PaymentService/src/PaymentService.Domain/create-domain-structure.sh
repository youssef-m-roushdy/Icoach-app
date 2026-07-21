#!/bin/bash

set -e

echo "Creating directories..."

mkdir -p AggregateRoots
mkdir -p Enums
mkdir -p Events
mkdir -p Repositories

echo "Creating files..."

touch \
AggregateRoots/Payment.cs \
AggregateRoots/Subscription.cs \
AggregateRoots/PaymentTransaction.cs \
AggregateRoots/WebhookEvent.cs \
Enums/PaymentStatus.cs \
Enums/GatewayType.cs \
Enums/SubscriptionPlanType.cs \
Enums/SubscriptionStatus.cs \
Events/BaseDomainEvent.cs \
Events/PaymentFailedEvent.cs \
Events/PaymentRefundedEvent.cs \
Events/PaymentSucceededEvent.cs \
Events/SubscriptionActivatedEvent.cs \
Events/SubscriptionCanceledEvent.cs \
Events/SubscriptionRenewedEvent.cs \
Repositories/IPaymentRepository.cs \
Repositories/ISubscriptionRepository.cs \
Repositories/IUnitOfWork.cs

echo "Done!"