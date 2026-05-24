import { Routes } from '@angular/router';
import { loginGuard } from './guards/login.guard';
import { authGuard }  from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path:        '',
    loadComponent: () => import('./home/home').then(m => m.Home),
    canActivate: [loginGuard],
  },
  {
    path:        'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path:        'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminPanel),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
