import { Component, computed, inject } from '@angular/core';
import { HOME_CONTENT, SITE_CONFIG, SITE_IDENTITY } from '../content/home-content';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-site-footer',
  styleUrl: './site-footer.css',
  templateUrl: './site-footer.html',
})
export class SiteFooterComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly copy = computed(() => HOME_CONTENT[this.localeService.locale()]);
  protected readonly identity = SITE_IDENTITY;
  protected readonly socialLinks = SITE_CONFIG.socialLinks;
}
