import { Component, computed, effect, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { LAB_PROJECTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { MarkdownService } from '../cms/markdown.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-lab-detail-page',
  templateUrl: './templates/lab-detail-page.html',
})
export class LabDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly markdown = inject(MarkdownService);
  private readonly seo = inject(SeoMetadataService);
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });
  private readonly cmsProject = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) => (slug ? this.cmsApi.labProject(slug) : of(null))),
    ),
    { initialValue: null },
  );
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].lab);
  protected readonly project = computed(
    () => this.cmsProject() ?? LAB_PROJECTS.find((item) => item.slug === this.slug()) ?? null,
  );

  constructor() {
    effect(() => {
      const entry = this.project();
      if (!entry) {
        if (this.response) this.response.status = 404;
        this.seo.applyValues(
          `${this.copy().notFoundTitle} | Mustafa BERBER`,
          this.copy().notFoundBody,
          undefined,
          undefined,
          { locale: this.locale(), robots: 'noindex, follow' },
        );
        return;
      }
      this.seo.applyValues(
        `${this.localized(entry.title)} | Mustafa BERBER`,
        this.localized(entry.summary),
        entry.canonicalUrl,
        entry.ogImage ?? entry.coverImage,
        {
          locale: this.locale(),
          type: 'creativeWork',
          schemaTitle: this.localized(entry.title),
        },
      );
      if (this.response) this.response.status = 200;
    });
  }

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }

  protected renderMarkdown(value: LocalizedText): string {
    return this.markdown.render(this.localized(value));
  }
}
