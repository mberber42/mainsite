import { Routes } from '@angular/router';

export const routes: Routes = [
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
