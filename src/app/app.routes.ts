import { Routes } from '@angular/router';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/admin-login').then((page) => page.AdminLoginComponent),
  },
  {
    path: 'admin',
    canActivateChild: [adminGuard],
    loadComponent: () => import('./admin/admin-layout').then((page) => page.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/admin-dashboard').then((page) => page.AdminDashboardComponent),
      },
      {
        path: 'content/:kind',
        loadComponent: () =>
          import('./admin/admin-content').then((page) => page.AdminContentComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./admin/admin-messages').then((page) => page.AdminMessagesComponent),
      },
      {
        path: 'files',
        loadComponent: () => import('./admin/admin-files').then((page) => page.AdminFilesComponent),
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home-page/home-page').then((page) => page.HomePageComponent),
  },
  {
    path: 'hakkimda',
    loadComponent: () => import('./pages/about-page').then((page) => page.AboutPageComponent),
  },
  {
    path: 'hizmetler',
    loadComponent: () => import('./pages/services-page').then((page) => page.ServicesPageComponent),
  },
  {
    path: 'blog',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/blog-list-page').then((page) => page.BlogListPageComponent),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./pages/blog-detail-page').then((page) => page.BlogDetailPageComponent),
  },
  {
    path: 'lab',
    pathMatch: 'full',
    loadComponent: () => import('./pages/lab-list-page').then((page) => page.LabListPageComponent),
  },
  {
    path: 'lab/:slug',
    loadComponent: () =>
      import('./pages/lab-detail-page').then((page) => page.LabDetailPageComponent),
  },
  {
    path: 'iletisim',
    loadComponent: () => import('./pages/contact-page').then((page) => page.ContactPageComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found-page').then((page) => page.NotFoundPageComponent),
  },
];
