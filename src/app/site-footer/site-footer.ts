import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME_CONTENT, SITE_CONFIG, SITE_IDENTITY } from '../content/home-content';
import { PUBLIC_COPY } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';

@Component({
  imports: [RouterLink],
  selector: 'app-site-footer',
  styleUrl: './site-footer.css',
  templateUrl: './site-footer.html',
})
export class SiteFooterComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => HOME_CONTENT[this.locale()]);
  protected readonly publicCopy = computed(() => PUBLIC_COPY[this.locale()]);
  protected readonly identity = SITE_IDENTITY;
  protected readonly socialLinks = SITE_CONFIG.socialLinks;
}
