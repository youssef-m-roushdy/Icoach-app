import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { DashboardHomeComponent } from './features/dashboard/pages/dashboard-home/dashboard-home.component';
import { LoginComponent } from './features/auth/pages/login/login.component';

export const routes: Routes = [
	{
		path: 'login',
		component: AuthLayoutComponent,
		children: [{ path: '', component: LoginComponent }],
	},
	{
		path: '',
		component: AdminLayoutComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{ path: 'dashboard', component: DashboardHomeComponent },
		],
	},
	{ path: '**', redirectTo: 'dashboard' },
];
