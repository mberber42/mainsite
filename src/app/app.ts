import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HOME_CONTENT } from './content/home-content';
import { LocaleService } from './i18n/locale.service';
import { SiteFooterComponent } from './site-footer/site-footer';
import { SiteHeaderComponent } from './site-header/site-header';

@Component({
  imports: [RouterOutlet, SiteFooterComponent, SiteHeaderComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly localeService = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly isAdmin = computed(() => this.currentUrl().startsWith('/admin'));
  protected readonly skipLinkLabel = computed(
    () => HOME_CONTENT[this.localeService.locale()].accessibility.skipToContent,
  );
}
