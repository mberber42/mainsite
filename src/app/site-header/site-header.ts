import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME_CONTENT, type Locale } from '../content/home-content';
import { LocaleService } from '../i18n/locale.service';

@Component({
  imports: [RouterLink],
  selector: 'app-site-header',
  styleUrl: './site-header.css',
  templateUrl: './site-header.html',
})
export class SiteHeaderComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => HOME_CONTENT[this.locale()]);

  protected setLocale(locale: Locale): void {
    this.localeService.setLocale(locale);
  }
}
