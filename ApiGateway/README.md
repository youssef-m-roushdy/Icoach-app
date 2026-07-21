# 🌐 ApiGateway

A lightweight API Gateway built with ASP.NET Core and Ocelot for the iCoach platform. It centralizes routing, authentication, and cross-service communication so clients can interact with the system through a single entry point.

## 📚 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Getting Started](#-getting-started)
- [Routing Overview](#-routing-overview)
- [Testing](#-testing)

## 📝 Overview

The API Gateway acts as the front door for the platform. It receives requests from clients and forwards them to the appropriate downstream services such as the Node.js backend, payment service, and other internal APIs.

This service is designed to simplify client integration while enforcing a consistent request flow, security layer, and routing strategy.

## ✨ Features

- Centralized API entry point for frontend and mobile clients
- Dynamic routing with Ocelot
- JWT-based authentication and authorization flow
- Request aggregation and service forwarding
- Docker-ready deployment setup
- Environment-based configuration for development and production

## 🏗️ Architecture

The gateway is built around a simple request pipeline:

1. Client sends a request to the gateway.
2. The gateway evaluates the route from Ocelot configuration.
3. The request is forwarded to the appropriate downstream service.
4. The response is returned to the client in a unified shape.

### Key Components

- **ASP.NET Core** for the host application
- **Ocelot** for routing and downstream request management
- **appsettings.json** for base configuration
- **ocelot.json / ocelot.localhost.json** for route definitions
- **Docker** for containerized deployment

## ⚙️ Configuration

The gateway uses configuration files to define routes and service behavior.

### Main Files

- `appsettings.json` – base runtime configuration
- `appsettings.Development.json` – local development overrides
- `ocelot.json` – production routing configuration
- `ocelot.localhost.json` – local development routing configuration
- `ocelot.Docker.json` – Docker-specific routing setup

### Example Configuration

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

## 🛠️ Getting Started

### Prerequisites

- .NET 8 SDK
- Docker and Docker Compose
- Access to the downstream services you want to route to

### Run Locally

```bash
dotnet run
```

The gateway will start and use the local Ocelot configuration for request routing.

### Run with Docker

```bash
docker compose up --build
```

## 🧭 Routing Overview

Routes are defined through Ocelot and can be customized depending on the environment.

Typical routing behavior includes:

- forwarding requests to the Node.js backend
- routing payment-related traffic to the PaymentService
- applying shared gateway policies such as authentication and request rewriting

You can modify the route definitions in:

- [ocelot.json](ocelot.json)
- [ocelot.localhost.json](ocelot.localhost.json)
- [ocelot.Docker.json](ocelot.Docker.json)

## 🧪 Testing

Use the gateway checklist for manual validation of routes and service behavior:

- [GATEWAY_TESTING_CHECKLIST.md](GATEWAY_TESTING_CHECKLIST.md)

You can also run the service locally to verify route forwarding and health behavior.

---

Built with ❤️ for the iCoach platform.