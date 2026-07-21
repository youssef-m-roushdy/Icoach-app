# 💳 PaymentService

A production-ready payment microservice for the iCoach platform, built with ASP.NET Core 8. It handles checkout flows, subscriptions, and webhooks while keeping payment logic isolated from the main backend.

## 📚 Table of Contents

- [Overview](#-overview)
- [Business Capabilities](#-business-capabilities)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Security & Authentication](#-security--authentication)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Integration Guide](#-integration-guide)
- [Testing](#-testing)

## 📝 Overview

This service acts as the financial hub of the ecosystem. It owns its own PostgreSQL database and is responsible for interacting with external gateways such as Stripe, Paymob, and PayPal.

### Communication Flow

1. A client requests checkout through the API Gateway.
2. The Node.js backend sends an authenticated gRPC request to PaymentService.
3. PaymentService validates the JWT, creates the payment record, and calls the provider gateway.
4. The service returns a checkout URL to the backend.
5. The provider sends a webhook back to PaymentService after payment completion.
6. PaymentService validates the webhook, updates the database, and publishes the relevant event.

## 🚀 Business Capabilities

This service supports three core financial workflows:

- **One-off Product Orders**: Single payments for physical goods.
- **App Subscriptions**: Monthly or yearly billing for premium app access.
- **Coach Subscriptions**: Monthly or yearly billing for coach-specific access.

## 🏗️ Architecture & Tech Stack

The service follows Clean Architecture, DDD, and CQRS principles.

| Component | Technology |
| --- | --- |
| Framework | ASP.NET Core 8 |
| Database | PostgreSQL + Entity Framework Core |
| Communication | gRPC |
| CQRS & Mediation | MediatR |
| Validation | FluentValidation |
| Mapping | AutoMapper |
| Logging | Serilog |
| Containerization | Docker + Docker Compose |

## 📁 Project Structure

The solution is organized into clear layers for separation of concerns:

```text
src/
├── PaymentService.Api              # Presentation layer: gRPC endpoints, webhooks, middleware
├── PaymentService.Application      # Application layer: handlers, interfaces, validators
├── PaymentService.Domain           # Domain layer: entities, aggregates, domain events
├── PaymentService.Infrastructure   # Infrastructure layer: EF Core, repositories, gateway integrations
└── PaymentService.Contracts        # Shared contracts, DTOs, and proto definitions
```

## 🔒 Security & Authentication

### JWT Validation

This service does not issue tokens. It validates JWTs issued by the Node.js backend.

- The Node.js service signs the JWT with an RSA private key.
- PaymentService verifies it with the matching public key configured in app settings.
- The token is passed through gRPC metadata as `Authorization: Bearer <token>`.

### Webhook Security

- Webhook endpoints bypass standard JWT authentication.
- Requests are verified using the gateway signature.
- Processing is idempotent to reduce replay risks.

## 🛠️ Getting Started

### Prerequisites

- .NET 8 SDK
- Docker and Docker Compose
- A Stripe or Paymob test account for gateway credentials

### Option 1: Run with Docker

1. Clone the repository:

```bash
git clone https://github.com/your-org/PaymentService.git
cd PaymentService
```

2. Configure your secrets in `appsettings.json` or through environment variables in Docker Compose.

3. Build and start the services:

```bash
docker compose up -d --build
```

The service will start with PostgreSQL and apply EF Core migrations automatically.

- gRPC endpoint: http://localhost:5001
- HTTP/webhook endpoint: http://localhost:8080

### Option 2: Run Locally

Make sure PostgreSQL is running, then update the connection string in `appsettings.Development.json`.

Run the API project:

```bash
cd src/PaymentService.Api
dotnet run
```

Apply migrations manually if auto-migration is disabled:

```bash
dotnet ef database update --project src/PaymentService.Infrastructure --startup-project src/PaymentService.Api
```

## ⚙️ Configuration

Update your app settings with the required values:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Database=payments_db;Username=admin;Password=pass"
  },
  "Jwt": {
    "Issuer": "your-nodejs-server",
    "Audience": "your-app",
    "PublicKey": "-----BEGIN PUBLIC KEY-----\nYOUR_RSA_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"
  },
  "Stripe": {
    "SecretKey": "sk_test_your_stripe_secret",
    "WebhookSecret": "whsec_your_webhook_secret",
    "Prices": {
      "AppMonthly": "price_1xxx",
      "AppYearly": "price_2xxx",
      "CoachMonthly": "price_3xxx",
      "CoachYearly": "price_4xxx"
    }
  }
}
```

## 🔗 Integration Guide

To call this service from the Node.js backend, use `@grpc/grpc-js` and pass the user JWT in the metadata.

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync('path/to/payment.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition).payments;
const client = new paymentProto.PaymentGrpcService(
  'localhost:5001',
  grpc.credentials.createInsecure()
);

function createCoachSubscription(userJwtToken, userId, coachId) {
  const metadata = new grpc.Metadata();
  metadata.add('authorization', `Bearer ${userJwtToken}`);

  return new Promise((resolve, reject) => {
    client.CreateSubscription(
      {
        user_id: userId,
        plan_type: 'CoachMonthly',
        gateway: 'Stripe',
        coach_id: coachId
      },
      metadata,
      (err, response) => {
        if (err) reject(err);
        else resolve(response.checkout_url);
      }
    );
  });
}
```

## 🧪 Testing

The solution is structured for unit and integration testing.

- **Unit tests** validate domain logic, handlers, and validators.
- **Integration tests** cover gRPC endpoints and repository behavior.

Run the test suite with:

```bash
dotnet test
```

---

Built with ❤️ for the iCoach platform.
