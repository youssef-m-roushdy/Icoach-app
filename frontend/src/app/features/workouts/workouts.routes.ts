import { Routes } from '@angular/router';
import { WorkoutListComponent } from './pages/workout-list/workout-list.component';
import { WorkoutFormComponent } from './pages/workout-form/workout-form.component';
import { WorkoutDetailComponent } from './pages/workout-detail/workout-detail.component';

export const WORKOUT_ROUTES: Routes = [
  { path: '', component: WorkoutListComponent },
  { path: 'create', component: WorkoutFormComponent },
  { path: 'edit/:id', component: WorkoutFormComponent },
  { path: ':id', component: WorkoutDetailComponent },
];