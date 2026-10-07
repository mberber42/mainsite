import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BLOG_POSTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-blog-list-page',
  templateUrl: './templates/blog-list-page.html',
})
export class BlogListPageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly cmsPosts = toSignal(this.cmsApi.blogPosts(), { initialValue: null });
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'blog'), { initialValue: null });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].blog);
  protected readonly posts = computed(() => this.cmsPosts() ?? BLOG_POSTS);

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

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }
}
