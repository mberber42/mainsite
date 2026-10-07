import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'hakkimda', renderMode: RenderMode.Server },
  { path: 'hizmetler', renderMode: RenderMode.Server },
  { path: 'blog', renderMode: RenderMode.Server },
  { path: 'blog/:slug', renderMode: RenderMode.Server },
  { path: 'lab', renderMode: RenderMode.Server },
  { path: 'lab/:slug', renderMode: RenderMode.Server },
  { path: 'iletisim', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
