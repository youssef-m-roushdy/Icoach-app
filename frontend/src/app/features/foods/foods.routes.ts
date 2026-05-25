import { Routes } from '@angular/router';
import { FoodListComponent } from './pages/food-list/food-list.component';
import { FoodFormComponent } from './pages/food-form/food-form.component';
// import { FoodDetailComponent } from './pages/food-detail/food-detail.component';

export const FOOD_ROUTES: Routes = [
  { path: '', component: FoodListComponent },
  { path: 'create', component: FoodFormComponent },
  { path: 'edit/:id', component: FoodFormComponent },
//   { path: ':id', component: FoodDetailComponent },
];