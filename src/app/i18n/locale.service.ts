import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import type { Locale } from '../content/home-content';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly activeLocale = signal<Locale>('tr');

  readonly locale = this.activeLocale.asReadonly();

  constructor() {
    this.document.documentElement.lang = this.activeLocale();
  }

  setLocale(locale: Locale): void {
    if (this.activeLocale() === locale) {
      return;
    }

    this.activeLocale.set(locale);
    this.document.documentElement.lang = locale;
  }
}
