import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout').then(m => m.Layout),
    children: [
      { path: '',           loadComponent: () => import('./pages/home/home').then(m => m.Home) },
      { path: 'dashboard',  loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'quote',      loadComponent: () => import('./pages/quote/quote').then(m => m.Quote) },
      // Renamed: was /production -> now /produtos (page also relabeled "Produtos")
      { path: 'produtos',   loadComponent: () => import('./pages/production/production').then(m => m.Production) },
      { path: 'materiais/embalagens', loadComponent: () => import('./pages/embalagens/embalagens').then(m => m.Embalagens) },
      { path: 'materiais/filamentos', loadComponent: () => import('./pages/inventory/inventory').then(m => m.Inventory) },
      { path: 'materiais/insumos',    loadComponent: () => import('./pages/insumos/insumos').then(m => m.Insumos) },
      // Backward-compatible aliases
      { path: 'inventory',  redirectTo: 'materiais/filamentos', pathMatch: 'full' },
      { path: 'production', redirectTo: 'produtos', pathMatch: 'full' },
      { path: 'products',   redirectTo: 'produtos', pathMatch: 'full' },
      { path: 'settings',   loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsPage) },
    ],
  },
];
