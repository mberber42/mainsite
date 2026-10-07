import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BLOG_POSTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-blog-list-page',
  templateUrl: './templates/blog-list-page.html',
})
export class BlogListPageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].blog);
  protected readonly posts = BLOG_POSTS;

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }
}
