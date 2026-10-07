import { Component, computed, effect, inject } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LAB_PROJECTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
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
  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].lab);
  protected readonly project = computed(
    () => LAB_PROJECTS.find((item) => item.slug === this.slug()) ?? null,
  );

  constructor() {
    effect(() => {
      if (!this.project() && this.response) {
        this.response.status = 404;
      }
    });
  }

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }
}
