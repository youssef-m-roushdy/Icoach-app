import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { DashboardHomeComponent } from './features/dashboard/pages/dashboard-home/dashboard-home.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { authGuard, redirectIfAuthenticatedGuard, adminGuard } from './core/auth/auth.guard';

// Import components directly
import { UserListComponent } from './features/users/pages/user-list/user-list.component';
import { UserFormComponent } from './features/users/pages/user-form/user-form.component';
import { UserDetailComponent } from './features/users/pages/user-detail/user-detail.component';
import { FoodListComponent } from './features/foods/pages/food-list/food-list.component';
import { FoodFormComponent } from './features/foods/pages/food-form/food-form.component';
import { FoodDetailComponent } from './features/foods/pages/food-detail/food-detail.component';
import { WorkoutListComponent } from './features/workouts/pages/workout-list/workout-list.component';
import { WorkoutFormComponent } from './features/workouts/pages/workout-form/workout-form.component';
import { WorkoutDetailComponent } from './features/workouts/pages/workout-detail/workout-detail.component';
import { ProfileSettingsComponent } from './features/profile/pages/profile-settings/profile-settings.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayoutComponent,
    canActivate: [redirectIfAuthenticatedGuard],
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'users', component: UserListComponent },
      { path: 'users/create', component: UserFormComponent },
      { path: 'users/edit/:id', component: UserFormComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'foods', component: FoodListComponent },
      { path: 'foods/create', component: FoodFormComponent },
      { path: 'foods/edit/:id', component: FoodFormComponent },
      { path: 'foods/:id', component: FoodDetailComponent },
      { path: 'workouts', component: WorkoutListComponent },
      { path: 'workouts/create', component: WorkoutFormComponent },
      { path: 'workouts/edit/:id', component: WorkoutFormComponent },
      { path: 'workouts/:id', component: WorkoutDetailComponent },
      { path: 'profile', component: ProfileSettingsComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];