import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, REQUEST } from '@angular/core';
import { firstValueFrom, Observable, catchError, map, of } from 'rxjs';
import type { BlogPost, LabProject, LocalizedText } from '../content/public-content';

export type CmsKind =
  'blog' | 'lab' | 'services' | 'faqs' | 'testimonials' | 'social-links' | 'hero' | 'seo';

export interface CmsEntry {
  id: string;
  kind: CmsKind;
  slug: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title: LocalizedText;
  summary?: LocalizedText;
  description?: LocalizedText;
  body?: LocalizedText | string | readonly LocalizedText[];
  category?: LocalizedText;
  tags?: readonly (LocalizedText | string)[];
  coverImage?: string;
  coverFileId?: string;
  coverAlt?: LocalizedText;
  seoTitle?: LocalizedText;
  seoDescription?: LocalizedText;
  ogImage?: string;
  href?: string;
  canonicalUrl?: string;
  readingMinutes?: number | null;
  links?: readonly { label: LocalizedText; href: string }[];
}

export interface CmsDashboard {
  blogTotal: number;
  labTotal: number;
  publishedTotal: number;
  draftTotal: number;
  serviceTotal: number;
  faqTotal: number;
  testimonialTotal: number;
  unreadMessages: number;
  recentMessages: CmsMessage[];
}

export interface CmsMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

function localized(value: unknown): LocalizedText {
  if (typeof value === 'string') return { tr: value, en: value };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as Partial<LocalizedText>;
    return {
      tr: typeof candidate.tr === 'string' ? candidate.tr : '',
      en: typeof candidate.en === 'string' ? candidate.en : '',
    };
  }
  return { tr: '', en: '' };
}

function paragraphs(value: CmsEntry['body']): readonly LocalizedText[] {
  if (Array.isArray(value)) return value.map(localized);
  const body = localized(value);
  const turkish = body.tr
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const english = body.en
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Array.from({ length: Math.max(turkish.length, english.length) }, (_, index) => ({
    tr: turkish[index] ?? '',
    en: english[index] ?? '',
  }));
}

function localizedTags(tags: CmsEntry['tags']): readonly LocalizedText[] {
  return (tags ?? []).map(localized);
}

@Injectable({ providedIn: 'root' })
export class CmsApiService {
  private readonly http = inject(HttpClient);
  private readonly request = inject(REQUEST, { optional: true });
  private csrfToken = '';

  private apiUrl(path: string): string {
    if (!this.request?.url) return path;
    try {
      return new URL(path, new URL(this.request.url).origin).toString();
    } catch {
      return path;
    }
  }

  entries(kind: CmsKind): Observable<readonly CmsEntry[] | null> {
    return this.http.get<readonly CmsEntry[]>(this.apiUrl(`/api/public/content/${kind}`)).pipe(
      map((entries) => entries),
      catchError(() => of(null)),
    );
  }

  entry(kind: CmsKind, slug: string): Observable<CmsEntry | null> {
    return this.http
      .get<CmsEntry>(this.apiUrl(`/api/public/content/${kind}/${encodeURIComponent(slug)}`))
      .pipe(catchError(() => of(null)));
  }

  blogPosts(): Observable<readonly BlogPost[] | null> {
    return this.entries('blog').pipe(
      map((items) =>
        items === null
          ? null
          : items.map(
              (entry) =>
                ({
                  slug: entry.slug,
                  title: localized(entry.title),
                  summary: localized(entry.summary),
                  body: paragraphs(entry.body),
                  bodyMarkdown: localized(entry.body),
                  category: entry.category ? localized(entry.category) : undefined,
                  tags: localizedTags(entry.tags),
                  publishedAt: entry.publishedAt ?? undefined,
                  readingMinutes: entry.readingMinutes ?? undefined,
                  seoTitle: entry.seoTitle ? localized(entry.seoTitle) : undefined,
                  seoDescription: entry.seoDescription
                    ? localized(entry.seoDescription)
                    : undefined,
                  canonicalUrl: entry.canonicalUrl,
                  ogImage: entry.ogImage,
                  coverImage: entry.coverImage || undefined,
                  coverAlt: entry.coverImage ? localized(entry.coverAlt) : undefined,
                }) as BlogPost,
            ),
      ),
    );
  }

  blogPost(slug: string): Observable<BlogPost | null> {
    return this.entry('blog', slug).pipe(
      map((entry) =>
        entry
          ? ({
              slug: entry.slug,
              title: localized(entry.title),
              summary: localized(entry.summary),
              body: paragraphs(entry.body),
              bodyMarkdown: localized(entry.body),
              category: entry.category ? localized(entry.category) : undefined,
              tags: localizedTags(entry.tags),
              publishedAt: entry.publishedAt ?? undefined,
              readingMinutes: entry.readingMinutes ?? undefined,
              seoTitle: entry.seoTitle ? localized(entry.seoTitle) : undefined,
              seoDescription: entry.seoDescription ? localized(entry.seoDescription) : undefined,
              canonicalUrl: entry.canonicalUrl,
              ogImage: entry.ogImage,
              coverImage: entry.coverImage || undefined,
              coverAlt: entry.coverImage ? localized(entry.coverAlt) : undefined,
            } as BlogPost)
          : null,
      ),
    );
  }

  labProjects(): Observable<readonly LabProject[] | null> {
    return this.entries('lab').pipe(
      map((items) =>
        items === null
          ? null
          : items.map(
              (entry) =>
                ({
                  slug: entry.slug,
                  title: localized(entry.title),
                  summary: localized(entry.summary),
                  description: paragraphs(entry.body ?? entry.description),
                  bodyMarkdown: localized(entry.body ?? entry.description),
                  category: entry.category ? localized(entry.category) : undefined,
                  tags: localizedTags(entry.tags),
                  links: entry.links,
                  canonicalUrl: entry.canonicalUrl,
                  ogImage: entry.ogImage,
                  coverImage: entry.coverImage || undefined,
                  coverAlt: entry.coverImage ? localized(entry.coverAlt) : undefined,
                }) as LabProject,
            ),
      ),
    );
  }

  labProject(slug: string): Observable<LabProject | null> {
    return this.entry('lab', slug).pipe(
      map((entry) =>
        entry
          ? ({
              slug: entry.slug,
              title: localized(entry.title),
              summary: localized(entry.summary),
              description: paragraphs(entry.body ?? entry.description),
              bodyMarkdown: localized(entry.body ?? entry.description),
              category: entry.category ? localized(entry.category) : undefined,
              tags: localizedTags(entry.tags),
              links: entry.links,
              canonicalUrl: entry.canonicalUrl,
              ogImage: entry.ogImage,
              coverImage: entry.coverImage || undefined,
              coverAlt: entry.coverImage ? localized(entry.coverAlt) : undefined,
            } as LabProject)
          : null,
      ),
    );
  }

  async session(): Promise<{ authenticated: boolean; email?: string; csrfToken: string }> {
    const response = await firstValueFrom(
      this.http.get<{ authenticated: boolean; email?: string; csrfToken: string }>(
        '/api/auth/session',
      ),
    );
    this.csrfToken = response.csrfToken;
    return response;
  }

  async login(email: string, password: string): Promise<{ email: string }> {
    if (!this.csrfToken) {
      const token = await firstValueFrom(this.http.get<{ csrfToken: string }>('/api/auth/csrf'));
      this.csrfToken = token.csrfToken;
    }
    const response = await firstValueFrom(
      this.http.post<{ email: string; csrfToken: string }>(
        '/api/auth/login',
        { email, password },
        { headers: new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }) },
      ),
    );
    this.csrfToken = response.csrfToken;
    return { email: response.email };
  }

  async logout(): Promise<void> {
    await this.mutate<void>('POST', '/api/auth/logout', {});
    this.csrfToken = '';
  }

  async get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(path));
  }

  cvUrl(): Observable<string | null> {
    return this.http.get<{ url: string | null }>(this.apiUrl('/api/public/site/cv')).pipe(
      map((response) => response.url),
      catchError(() => of(null)),
    );
  }

  async mutate<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.csrfToken) await this.session();
    const headers = new HttpHeaders({ 'X-CSRF-Token': this.csrfToken });
    const options = { headers };
    let request: Observable<T>;
    switch (method) {
      case 'POST':
        request = this.http.post<T>(path, body ?? {}, options);
        break;
      case 'PUT':
        request = this.http.put<T>(path, body ?? {}, options);
        break;
      case 'PATCH':
        request = this.http.patch<T>(path, body ?? {}, options);
        break;
      case 'DELETE':
        request = this.http.delete<T>(path, { ...options, body });
        break;
    }
    return firstValueFrom(request);
  }

  async upload(path: string, file: File): Promise<{ id: string; url: string; mediaType: string }> {
    if (!this.csrfToken) await this.session();
    const body = new FormData();
    body.set('file', file, file.name);
    return firstValueFrom(
      this.http.post<{ id: string; url: string; mediaType: string }>(path, body, {
        headers: new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }),
      }),
    );
  }
}
