# ICoach Admin Dashboard

A modern, responsive, and feature-rich Admin Dashboard for the **ICoach** platform. Built with Angular and Angular Material, this dashboard provides comprehensive tools for administrators to manage users, workouts, foods, and system data.

## 🚀 Features

- **Authentication & Security**
  - Secure login with JWT (Access & HTTP-only Refresh Tokens)
  - Role-based access control (RBAC) and route guards
  - Automatic token refreshing
- **Dashboard & Analytics**
  - High-level statistics and data visualization using Chart.js
- **User Management**
  - View, search, and manage registered admin and mobile users
  - Role assignment and profile management
- **Workout Management**
  - Create, view, edit, and delete workouts
  - Detailed workout views (sets, reps, muscle groups, etc.)
- **Food & Nutrition Management**
  - Create, view, edit, and delete food items
  - Macronutrients and calorie tracking
- **Modern UI/UX**
  - Built with Angular Material components
  - Responsive layout tailored for desktop and mobile displays
  - Custom theming support

## 🛠 Tech Stack

- **Framework:** [Angular](https://angular.dev/)
- **UI Component Library:** [Angular Material](https://material.angular.io/)
- **Data Visualization:** Chart.js & ng2-charts
- **HTTP Client & RxJS:** Reactive state management and API communication

## 📂 Project Structure

\`\`\`text
src/
├── app/
│   ├── core/         # Core HTTP Interceptors, Guards, Auth & API Services
│   ├── features/     # Feature modules (Dashboard, Users, Workouts, Foods)
│   ├── layouts/      # Main layout wrappers (AdminLayout, AuthLayout)
│   ├── models/       # TypeScript interfaces and types
│   ├── shared/       # Shared UI components (Data tables, Confirm dialogs)
│   ├── app.routes.ts # Application routing configuration
│   └── app.config.ts # Global application providers
├── environments/     # Environment variables for dev/prod
└── assets/           # Static assets, images, icons
\`\`\`

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/)
- Angular CLI (`npm install -g @angular/cli`)

## 🚀 Getting Started

1. **Install Dependencies**
   \`\`\`bash
   cd frontend
   npm install
   \`\`\`

2. **Configure Environments**
   By default, the application connects to the local backend API. Adjust the apiUrl in `src/environments/environment.ts` if needed.
   \`\`\`typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8080/api',
   };
   \`\`\`

3. **Run the Development Server**
   \`\`\`bash
   ng serve
   \`\`\`
   Navigate to `http://localhost:4200/`.

## 🏗 Build for Production

\`\`\`bash
ng build --configuration production
\`\`\`
The build artifacts will be stored in the `dist/` directory.

