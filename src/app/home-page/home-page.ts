import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HOME_CONTENT, SITE_IDENTITY } from '../content/home-content';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  imports: [RouterLink],
  selector: 'app-home-page',
  styleUrl: './home-page.css',
  templateUrl: './home-page.html',
})
export class HomePageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly heroEntries = toSignal(this.cmsApi.entries('hero'), { initialValue: null });
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'home'), { initialValue: null });
  protected readonly copy = computed(() => {
    const locale = this.localeService.locale();
    const base = HOME_CONTENT[locale];
    const hero = this.heroEntries()?.[0];
    if (!hero) return base;
    return {
      ...base,
      hero: {
        ...base.hero,
        value: hero.title[locale] || base.hero.value,
        description: hero.summary?.[locale] || base.hero.description,
        eyebrow: hero.category?.[locale] || base.hero.eyebrow,
      },
    };
  });
  protected readonly identity = SITE_IDENTITY;

  constructor() {
    effect(() =>
      this.seo.applyEntry(
        this.seoEntry(),
        this.localeService.locale(),
        `${this.copy().hero.value} | ${SITE_IDENTITY.name}`,
        this.copy().hero.description,
      ),
    );
  }
}
