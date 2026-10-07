import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CmsApiService } from '../cms/cms-api.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent {
  private readonly api = inject(CmsApiService);
  private readonly router = inject(Router);
  protected readonly modules = [
    { path: '/admin/dashboard', label: 'Genel bakış' },
    { path: '/admin/content/blog', label: 'Blog yazıları' },
    { path: '/admin/content/lab', label: 'Lab projeleri' },
    { path: '/admin/content/services', label: 'Hizmetler' },
    { path: '/admin/content/faqs', label: 'SSS' },
    { path: '/admin/content/testimonials', label: 'Referanslar' },
    { path: '/admin/content/social-links', label: 'Sosyal bağlantılar' },
    { path: '/admin/content/hero', label: 'Hero içerikleri' },
    { path: '/admin/content/seo', label: 'SEO meta' },
    { path: '/admin/messages', label: 'İletişim mesajları' },
    { path: '/admin/files', label: 'CV ve dosyalar' },
  ];

  protected async logout(): Promise<void> {
    try {
      await this.api.logout();
    } finally {
      await this.router.navigateByUrl('/admin/login');
    }
  }
}
