import { Component, computed, inject } from '@angular/core';
import { HOME_CONTENT } from './content/home-content';
import { LocaleService } from './i18n/locale.service';
import { HomePageComponent } from './home-page/home-page';
import { SiteFooterComponent } from './site-footer/site-footer';
import { SiteHeaderComponent } from './site-header/site-header';

@Component({
  imports: [HomePageComponent, SiteFooterComponent, SiteHeaderComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly localeService = inject(LocaleService);
  protected readonly skipLinkLabel = computed(
    () => HOME_CONTENT[this.localeService.locale()].accessibility.skipToContent,
  );
}
