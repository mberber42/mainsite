import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { Locale } from '../content/home-content';
import type { CmsEntry } from './cms-api.service';
import type { LocalizedText } from '../content/public-content';

function valueForLocale(value: unknown, locale: Locale): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const localized = value as Partial<LocalizedText>;
    return typeof localized[locale] === 'string' ? localized[locale] : '';
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class SeoMetadataService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  applyEntry(
    entry: CmsEntry | null,
    locale: Locale,
    fallbackTitle: string,
    fallbackDescription: string,
  ): void {
    this.applyValues(
      entry?.seoTitle
        ? valueForLocale(entry.seoTitle, locale)
        : entry?.title
          ? valueForLocale(entry.title, locale)
          : fallbackTitle,
      entry?.seoDescription
        ? valueForLocale(entry.seoDescription, locale)
        : entry?.summary
          ? valueForLocale(entry.summary, locale)
          : fallbackDescription,
      entry?.canonicalUrl,
      entry?.ogImage,
    );
  }

  applyValues(title: string, description: string, canonicalUrl?: string, imageUrl?: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({
      name: 'twitter:card',
      content: imageUrl ? 'summary_large_image' : 'summary',
    });
    if (imageUrl) this.meta.updateTag({ property: 'og:image', content: imageUrl });
    if (canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
      let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = this.document.createElement('link');
        canonical.rel = 'canonical';
        this.document.head.append(canonical);
      }
      canonical.href = canonicalUrl;
    }
  }
}
