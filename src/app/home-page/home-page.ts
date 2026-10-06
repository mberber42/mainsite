import { Component, computed, inject } from '@angular/core';
import { HOME_CONTENT, SITE_IDENTITY } from '../content/home-content';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-home-page',
  styleUrl: './home-page.css',
  templateUrl: './home-page.html',
})
export class HomePageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly copy = computed(() => HOME_CONTENT[this.localeService.locale()]);
  protected readonly identity = SITE_IDENTITY;
}
