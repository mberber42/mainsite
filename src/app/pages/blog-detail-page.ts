import { Component, computed, effect, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BLOG_POSTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
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
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].blog);
  protected readonly post = computed(
    () => BLOG_POSTS.find((item) => item.slug === this.slug()) ?? null,
  );

  constructor() {
    effect(() => {
      if (!this.post() && this.response) {
        this.response.status = 404;
      }
    });
  }

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }
}
