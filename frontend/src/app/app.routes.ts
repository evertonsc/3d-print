import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout').then(m => m.Layout),
    children: [
      { path: '',          loadComponent: () => import('./pages/home/home').then(m => m.Home) },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'products',  loadComponent: () => import('./pages/products/products').then(m => m.Products) },
      { path: 'production',loadComponent: () => import('./pages/production/production').then(m => m.Production) },
      { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory').then(m => m.Inventory) },
    ],
  },
];
