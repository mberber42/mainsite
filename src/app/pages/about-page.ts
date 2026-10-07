import { Component, computed, inject } from '@angular/core';
import { SITE_IDENTITY } from '../content/home-content';
import { PROFILE_CONTENT, PUBLIC_COPY } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent],
  selector: 'app-about-page',
  templateUrl: './templates/about-page.html',
})
export class AboutPageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].about);
  protected readonly profile = PROFILE_CONTENT;
  protected readonly identity = SITE_IDENTITY;
}
