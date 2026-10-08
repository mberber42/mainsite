import { Component, computed, effect, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_COPY } from '../content/public-content';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-not-found-page',
  templateUrl: './templates/not-found-page.html',
})
export class NotFoundPageComponent {
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly localeService = inject(LocaleService);
  private readonly seo = inject(SeoMetadataService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].notFound);

  constructor() {
    if (this.response) this.response.status = 404;
    effect(() => {
      const copy = this.copy();
      this.seo.applyValues(
        `${copy.title} | Mustafa BERBER`,
        copy.description,
        undefined,
        undefined,
        {
          locale: this.locale(),
          robots: 'noindex, follow',
        },
      );
    });
  }
}
