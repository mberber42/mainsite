import { Component, computed, effect, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { BLOG_POSTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { MarkdownService } from '../cms/markdown.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-blog-detail-page',
  templateUrl: './templates/blog-detail-page.html',
})
export class BlogDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly markdown = inject(MarkdownService);
  private readonly seo = inject(SeoMetadataService);
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });
  private readonly cmsPost = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) => (slug ? this.cmsApi.blogPost(slug) : of(null))),
    ),
    { initialValue: null },
  );
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].blog);
  protected readonly post = computed(
    () => this.cmsPost() ?? BLOG_POSTS.find((item) => item.slug === this.slug()) ?? null,
  );

  constructor() {
    effect(() => {
      const article = this.post();
      const locale = this.locale();
      if (!article) {
        if (this.response) this.response.status = 404;
        this.seo.applyValues(
          `${this.copy().notFoundTitle} | Mustafa BERBER`,
          this.copy().notFoundBody,
          undefined,
          undefined,
          { locale, robots: 'noindex, follow' },
        );
        return;
      }
      const title = article.seoTitle
        ? this.localized(article.seoTitle)
        : this.localized(article.title);
      const description = article.seoDescription
        ? this.localized(article.seoDescription)
        : this.localized(article.summary);
      this.seo.applyValues(
        `${title} | Mustafa BERBER`,
        description,
        article.canonicalUrl,
        article.ogImage ?? article.coverImage,
        {
          locale,
          type: 'article',
          schemaTitle: title,
          publishedAt: article.publishedAt,
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
