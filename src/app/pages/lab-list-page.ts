import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LAB_PROJECTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-lab-list-page',
  templateUrl: './templates/lab-list-page.html',
})
export class LabListPageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly cmsProjects = toSignal(this.cmsApi.labProjects(), { initialValue: null });
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'lab'), { initialValue: null });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].lab);
  protected readonly projects = computed(() => this.cmsProjects() ?? LAB_PROJECTS);

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
