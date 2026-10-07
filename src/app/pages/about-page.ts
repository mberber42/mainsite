import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SITE_IDENTITY } from '../content/home-content';
import { PROFILE_CONTENT, PUBLIC_COPY } from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent],
  selector: 'app-about-page',
  templateUrl: './templates/about-page.html',
})
export class AboutPageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'about'), { initialValue: null });
  private readonly testimonialEntries = toSignal(this.cmsApi.entries('testimonials'), {
    initialValue: null,
  });
  private readonly socialEntries = toSignal(this.cmsApi.entries('social-links'), {
    initialValue: null,
  });
  private readonly remoteCvUrl = toSignal(this.cmsApi.cvUrl(), { initialValue: null });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].about);
  protected readonly profile = PROFILE_CONTENT;
  protected readonly identity = SITE_IDENTITY;
  protected readonly cvUrl = computed(() => this.remoteCvUrl() ?? this.profile.cvUrl);
  protected readonly socialLinks = computed(() => {
    const entries = this.socialEntries();
    if (entries?.length) {
      return entries.map((entry) => ({
        label: entry.title[this.locale()],
        href: entry.href || null,
      }));
    }
    return this.profile.socialLinks;
  });
  protected readonly testimonials = computed(() =>
    (this.testimonialEntries() ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title[this.locale()],
      quote: this.localizeBody(entry.body) || entry.summary?.[this.locale()] || '',
      attribution: entry.category?.[this.locale()] || entry.summary?.[this.locale()] || '',
    })),
  );

  constructor() {
    effect(() =>
      this.seo.applyEntry(
        this.seoEntry(),
        this.locale(),
        `${this.copy().title} | ${SITE_IDENTITY.name}`,
        this.copy().description,
      ),
    );
  }

  private localizeBody(value: unknown): string {
    const locale = this.locale();
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          item && typeof item === 'object' && locale in item
            ? String((item as Record<string, unknown>)[locale] ?? '')
            : '',
        )
        .filter(Boolean)
        .join('\n\n');
    }
    if (value && typeof value === 'object' && locale in value) {
      return String((value as Record<string, unknown>)[locale] ?? '');
    }
    return '';
  }
}
