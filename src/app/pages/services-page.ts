import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  PUBLIC_COPY,
  SERVICE_PLACEHOLDERS,
  SERVICE_PROCESS_PLACEHOLDERS,
} from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-services-page',
  templateUrl: './templates/services-page.html',
})
export class ServicesPageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly cmsServices = toSignal(this.cmsApi.entries('services'), { initialValue: null });
  private readonly cmsFaqs = toSignal(this.cmsApi.entries('faqs'), { initialValue: null });
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'services'), {
    initialValue: null,
  });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].services);
  protected readonly serviceCards = computed(() => {
    const entries = this.cmsServices();
    if (!entries?.length) return SERVICE_PLACEHOLDERS;
    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.summary ?? entry.description ?? { tr: '', en: '' },
      status: { tr: 'Yayımlandı', en: 'Published' },
    }));
  });
  protected readonly processSteps = SERVICE_PROCESS_PLACEHOLDERS;
  protected readonly faqs = computed(() =>
    (this.cmsFaqs() ?? []).map((entry) => ({
      id: entry.id,
      question: entry.title[this.locale()],
      answer: this.localizedBody(entry.body) || entry.summary?.[this.locale()] || '',
    })),
  );

  constructor() {
    effect(() =>
      this.seo.applyEntry(
        this.seoEntry(),
        this.locale(),
        `${this.copy().title} | Mustafa BERBER`,
        this.copy().description,
      ),
    );
  }

  private localizedBody(value: unknown): string {
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
