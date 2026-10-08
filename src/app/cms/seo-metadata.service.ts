import { DOCUMENT } from '@angular/common';
import { inject, Injectable, REQUEST } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { Locale } from '../content/home-content';
import { SITE_IDENTITY } from '../content/home-content';
import type { LocalizedText } from '../content/public-content';
import type { CmsEntry } from './cms-api.service';

export interface SeoOptions {
  locale?: Locale;
  type?: 'website' | 'article' | 'creativeWork';
  robots?: string;
  schemaTitle?: string;
  publishedAt?: string | null;
}

function valueForLocale(value: unknown, locale: Locale): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const localized = value as Partial<LocalizedText>;
    return typeof localized[locale] === 'string' ? localized[locale].trim() : '';
  }
  return '';
}

function parseHttpUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function configuredOrigin(): URL | null {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const configured = runtime.process?.env?.['PUBLIC_SITE_URL']?.trim();
  const url = parseHttpUrl(configured);
  if (!url || url.pathname !== '/' || url.search || url.hash) return null;
  if (runtime.process?.env?.['NODE_ENV'] === 'production' && url.protocol !== 'https:') return null;
  return new URL(url.origin);
}

function localOrigin(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
}

function withLocale(value: unknown, locale: Locale, fallback: string): string {
  return valueForLocale(value, locale) || fallback;
}

@Injectable({ providedIn: 'root' })
export class SeoMetadataService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });

  applyEntry(
    entry: CmsEntry | null,
    locale: Locale,
    fallbackTitle: string,
    fallbackDescription: string,
  ): void {
    const title = entry
      ? withLocale(entry.seoTitle, locale, withLocale(entry.title, locale, fallbackTitle))
      : fallbackTitle;
    const description = entry
      ? withLocale(
          entry.seoDescription,
          locale,
          withLocale(entry.summary ?? entry.description, locale, fallbackDescription),
        )
      : fallbackDescription;

    this.applyValues(title, description, entry?.canonicalUrl, entry?.ogImage, { locale });
  }

  applyValues(
    title: string,
    description: string,
    canonicalUrl?: string,
    imageUrl?: string,
    options: SeoOptions = {},
  ): void {
    const locale = options.locale ?? 'tr';
    const canonical = this.resolveCanonical(canonicalUrl);
    const image = this.resolveImage(imageUrl, canonical);
    const cleanTitle = title.trim();
    const cleanDescription = description.trim().replace(/\s+/g, ' ');
    const pageType = options.type === 'article' ? 'article' : 'website';

    this.title.setTitle(cleanTitle);
    this.meta.updateTag({ name: 'description', content: cleanDescription });
    this.meta.updateTag({ name: 'robots', content: options.robots ?? 'index, follow' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_IDENTITY.name });
    this.meta.updateTag({ property: 'og:type', content: pageType });
    this.meta.updateTag({ property: 'og:locale', content: locale === 'tr' ? 'tr_TR' : 'en_US' });
    this.meta.updateTag({ property: 'og:title', content: cleanTitle });
    this.meta.updateTag({ property: 'og:description', content: cleanDescription });
    this.meta.updateTag({
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: cleanTitle });
    this.meta.updateTag({ name: 'twitter:description', content: cleanDescription });

    if (canonical) {
      this.meta.updateTag({ property: 'og:url', content: canonical });
      this.meta.updateTag({ name: 'twitter:url', content: canonical });
      let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = this.document.createElement('link');
        link.rel = 'canonical';
        this.document.head.appendChild(link);
      }
      link.href = canonical;
    } else {
      this.meta.removeTag('property="og:url"');
      this.meta.removeTag('name="twitter:url"');
      this.document.querySelector('link[rel="canonical"]')?.remove();
    }

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    if (
      pageType === 'article' &&
      options.publishedAt &&
      !Number.isNaN(Date.parse(options.publishedAt))
    ) {
      this.meta.updateTag({ property: 'article:published_time', content: options.publishedAt });
    } else {
      this.meta.removeTag('property="article:published_time"');
    }

    this.setStructuredData({
      title: cleanTitle,
      description: cleanDescription,
      canonical,
      image,
      locale,
      type: options.type ?? 'website',
      schemaTitle: options.schemaTitle,
      publishedAt: options.publishedAt,
    });
  }

  setRobots(content: string): void {
    this.meta.updateTag({ name: 'robots', content });
  }

  private currentPageUrl(): URL | null {
    return parseHttpUrl(this.request?.url ?? this.document.location?.href ?? undefined);
  }

  private siteOrigin(): URL | null {
    const configured = configuredOrigin();
    if (configured) {
      this.meta.updateTag({ name: 'site-origin', content: configured.origin });
      return configured;
    }
    const serializedOrigin = parseHttpUrl(
      this.meta.getTag('name="site-origin"')?.getAttribute('content') ?? undefined,
    );
    if (serializedOrigin) return new URL(serializedOrigin.origin);
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    if (runtime.process?.env?.['NODE_ENV'] === 'production') return null;
    const current = this.currentPageUrl();
    if (current && localOrigin(current)) {
      this.meta.updateTag({ name: 'site-origin', content: current.origin });
      return new URL(current.origin);
    }
    return null;
  }

  private resolveCanonical(explicitUrl?: string): string | undefined {
    if (explicitUrl) {
      const explicit = parseHttpUrl(explicitUrl);
      if (explicit) {
        explicit.hash = '';
        explicit.search = '';
        return explicit.toString();
      }
    }

    const origin = this.siteOrigin();
    const current = this.currentPageUrl();
    if (!origin || !current) return undefined;
    const canonical = new URL(current.pathname, origin);
    canonical.hash = '';
    canonical.search = '';
    return canonical.toString();
  }

  private resolveImage(imageUrl: string | undefined, canonical?: string): string | undefined {
    if (!imageUrl?.trim()) return undefined;
    const origin = this.siteOrigin()?.origin ?? parseHttpUrl(canonical)?.origin;
    const image =
      parseHttpUrl(imageUrl) ??
      (origin ? parseHttpUrl(new URL(imageUrl, origin).toString()) : null);
    return image?.toString();
  }

  private setStructuredData(data: {
    title: string;
    description: string;
    canonical?: string;
    image?: string;
    locale: Locale;
    type: SeoOptions['type'];
    schemaTitle?: string;
    publishedAt?: string | null;
  }): void {
    const siteOrigin = this.siteOrigin();
    if (!siteOrigin) {
      this.document.querySelector('script[data-seo-jsonld]')?.remove();
      return;
    }
    const origin = siteOrigin.origin;

    const personId = `${origin}/#person`;
    const graph: Record<string, unknown>[] = [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: SITE_IDENTITY.name,
        inLanguage: data.locale,
      },
      {
        '@type': 'Person',
        '@id': personId,
        url: `${origin}/`,
        name: SITE_IDENTITY.name,
        jobTitle: SITE_IDENTITY.title,
      },
    ];

    if (data.type === 'article' || data.type === 'creativeWork') {
      const node: Record<string, unknown> = {
        '@type': data.type === 'article' ? 'BlogPosting' : 'CreativeWork',
        headline: data.schemaTitle ?? data.title,
        name: data.schemaTitle ?? data.title,
        description: data.description,
        inLanguage: data.locale,
      };
      if (data.type === 'article') node['author'] = { '@id': personId };
      if (data.canonical) {
        node['@id'] = data.canonical;
        node['mainEntityOfPage'] = { '@type': 'WebPage', '@id': data.canonical };
      }
      if (
        data.type === 'article' &&
        data.publishedAt &&
        !Number.isNaN(Date.parse(data.publishedAt))
      ) {
        node['datePublished'] = data.publishedAt;
      }
      if (data.image) node['image'] = data.image;
      graph.push(node);
    }

    const script =
      this.document.querySelector<HTMLScriptElement>('script[data-seo-jsonld]') ??
      this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', '');
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    if (!script.parentNode) this.document.head.appendChild(script);
  }
}
