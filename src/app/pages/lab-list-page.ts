import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LAB_PROJECTS, PUBLIC_COPY, type LocalizedText } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-lab-list-page',
  templateUrl: './templates/lab-list-page.html',
})
export class LabListPageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].lab);
  protected readonly projects = LAB_PROJECTS;

  protected localized(value: LocalizedText): string {
    return value[this.locale()];
  }
}
