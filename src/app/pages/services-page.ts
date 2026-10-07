import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PUBLIC_COPY,
  SERVICE_PLACEHOLDERS,
  SERVICE_PROCESS_PLACEHOLDERS,
} from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, RouterLink],
  selector: 'app-services-page',
  templateUrl: './templates/services-page.html',
})
export class ServicesPageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].services);
  protected readonly serviceCards = SERVICE_PLACEHOLDERS;
  protected readonly processSteps = SERVICE_PROCESS_PLACEHOLDERS;
}
