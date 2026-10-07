import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import type { LocalizedText } from '../content/public-content';
import { CmsApiService, type CmsEntry, type CmsKind } from '../cms/cms-api.service';

const MODULE_LABELS: Record<CmsKind, string> = {
  blog: 'Blog yazıları',
  lab: 'Lab projeleri',
  services: 'Hizmetler',
  faqs: 'Sık sorulan sorular',
  testimonials: 'Referanslar / testimonial’lar',
  'social-links': 'Sosyal bağlantılar',
  hero: 'Hero içerikleri',
  seo: 'SEO meta bilgileri',
};

function isLocalizedBody(value: CmsEntry['body']): value is { tr: string; en: string } {
  return Boolean(
    value && !Array.isArray(value) && typeof value === 'object' && 'tr' in value && 'en' in value,
  );
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-admin-content',
  templateUrl: './admin-content.html',
})
export class AdminContentComponent implements OnInit, OnDestroy {
  private readonly api = inject(CmsApiService);
  private readonly route = inject(ActivatedRoute);
  private routeSubscription?: Subscription;
  protected readonly kind = signal<CmsKind>('blog');
  protected readonly entries = signal<readonly CmsEntry[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly coverFileId = signal<string | null>(null);
  protected readonly coverUrl = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly form = new FormGroup({
    titleTr: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
    titleEn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    summaryTr: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    summaryEn: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    categoryTr: new FormControl('', { nonNullable: true }),
    categoryEn: new FormControl('', { nonNullable: true }),
    tags: new FormControl('', { nonNullable: true }),
    bodyTr: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20_000)] }),
    bodyEn: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20_000)] }),
    coverAltTr: new FormControl('', { nonNullable: true }),
    coverAltEn: new FormControl('', { nonNullable: true }),
    status: new FormControl<'draft' | 'published'>('draft', { nonNullable: true }),
    publishedAt: new FormControl('', { nonNullable: true }),
    seoTitleTr: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(180)] }),
    seoTitleEn: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(180)] }),
    seoDescriptionTr: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(320)],
    }),
    seoDescriptionEn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(320)],
    }),
    ogImage: new FormControl('', { nonNullable: true }),
    href: new FormControl('', { nonNullable: true }),
    linksJson: new FormControl('[]', {
      nonNullable: true,
      validators: [Validators.maxLength(5000)],
    }),
    canonicalUrl: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const value = params.get('kind') as CmsKind | null;
      this.kind.set(value && value in MODULE_LABELS ? value : 'blog');
      this.resetForm();
      void this.loadEntries();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected moduleLabel(): string {
    return MODULE_LABELS[this.kind()];
  }

  protected startNew(): void {
    this.resetForm();
    document.getElementById('content-title-tr')?.focus();
  }

  protected edit(entry: CmsEntry): void {
    let bodyTr: string;
    let bodyEn: string;
    if (typeof entry.body === 'string') {
      bodyTr = entry.body;
      bodyEn = entry.body;
    } else if (isLocalizedBody(entry.body)) {
      bodyTr = entry.body.tr;
      bodyEn = entry.body.en;
    } else {
      const bodyParagraphs = entry.body as readonly LocalizedText[] | undefined;
      bodyTr = bodyParagraphs?.map((paragraph) => paragraph.tr).join('\n\n') ?? '';
      bodyEn = bodyParagraphs?.map((paragraph) => paragraph.en).join('\n\n') ?? '';
    }
    this.editingId.set(entry.id);
    this.coverFileId.set(entry.coverFileId ?? null);
    this.coverUrl.set(entry.coverImage ?? '');
    this.form.reset({
      titleTr: entry.title?.tr ?? '',
      titleEn: entry.title?.en ?? '',
      slug: entry.slug,
      summaryTr: entry.summary?.tr ?? '',
      summaryEn: entry.summary?.en ?? '',
      categoryTr: entry.category?.tr ?? '',
      categoryEn: entry.category?.en ?? '',
      tags: entry.tags?.map((tag) => (typeof tag === 'string' ? tag : tag.tr)).join(', ') ?? '',
      bodyTr,
      bodyEn,
      coverAltTr: entry.coverAlt?.tr ?? '',
      coverAltEn: entry.coverAlt?.en ?? '',
      status: entry.status,
      publishedAt: entry.publishedAt ? new Date(entry.publishedAt).toISOString().slice(0, 16) : '',
      seoTitleTr: entry.seoTitle?.tr ?? '',
      seoTitleEn: entry.seoTitle?.en ?? '',
      seoDescriptionTr: entry.seoDescription?.tr ?? '',
      seoDescriptionEn: entry.seoDescription?.en ?? '',
      ogImage: entry.ogImage ?? '',
      href: entry.href ?? '',
      linksJson: JSON.stringify(entry.links ?? [], null, 2),
      canonicalUrl: entry.canonicalUrl ?? '',
    });
    document.getElementById('content-title-tr')?.focus();
  }

  protected async save(): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const form = this.form.getRawValue();
    let links: unknown[];
    try {
      const parsed: unknown = JSON.parse(form.linksJson || '[]');
      if (!Array.isArray(parsed) || parsed.length > 20) throw new Error('invalid_links');
      links = parsed;
    } catch {
      this.error.set('Proje bağlantıları geçerli JSON listesi olmalı (en fazla 20).');
      return;
    }
    this.saving.set(true);
    const publishedAt = form.publishedAt ? new Date(form.publishedAt).toISOString() : null;
    const payload = {
      slug: form.slug,
      title: { tr: form.titleTr, en: form.titleEn },
      summary: { tr: form.summaryTr, en: form.summaryEn },
      category: { tr: form.categoryTr, en: form.categoryEn },
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      body: { tr: form.bodyTr, en: form.bodyEn },
      coverFileId: this.coverFileId(),
      coverAlt: { tr: form.coverAltTr, en: form.coverAltEn },
      status: form.status,
      publishedAt,
      seoTitle: { tr: form.seoTitleTr, en: form.seoTitleEn },
      seoDescription: { tr: form.seoDescriptionTr, en: form.seoDescriptionEn },
      ogImage: form.ogImage,
      href: form.href,
      links,
      canonicalUrl: form.canonicalUrl,
    };
    try {
      const id = this.editingId();
      const method = id ? 'PUT' : 'POST';
      const path = `/api/admin/content/${this.kind()}${id ? `/${id}` : ''}`;
      const entry = await this.api.mutate<CmsEntry>(method, path, payload);
      this.notice.set(id ? 'Değişiklikler kaydedildi.' : 'İçerik oluşturuldu.');
      this.resetForm();
      await this.loadEntries();
      if (entry.slug) this.notice.update((notice) => `${notice} Slug: ${entry.slug}`);
    } catch {
      this.error.set(
        'Kayıt başarısız. Alanları kontrol edip tekrar deneyin; slug çakışıyor olabilir.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(entry: CmsEntry): Promise<void> {
    if (!globalThis.confirm(`“${entry.title.tr}” kaydı silinsin mi?`)) return;
    try {
      await this.api.mutate<void>('DELETE', `/api/admin/content/${this.kind()}/${entry.id}`);
      this.notice.set('Kayıt silindi.');
      if (this.editingId() === entry.id) this.resetForm();
      await this.loadEntries();
    } catch {
      this.error.set('Kayıt silinemedi.');
    }
  }

  protected async uploadCover(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.uploading.set(true);
    try {
      const uploaded = await this.api.upload('/api/admin/files/image', file);
      this.coverFileId.set(uploaded.id);
      this.coverUrl.set(uploaded.url);
      this.notice.set('Kapak görseli güvenli yerel depolamaya yüklendi.');
    } catch {
      this.error.set('Görsel yüklenemedi. PNG, JPEG veya WebP ve en fazla 5 MB kullanın.');
    } finally {
      input.value = '';
      this.uploading.set(false);
    }
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.coverFileId.set(null);
    this.coverUrl.set('');
    this.form.reset({
      titleTr: '',
      titleEn: '',
      slug: '',
      summaryTr: '',
      summaryEn: '',
      categoryTr: '',
      categoryEn: '',
      tags: '',
      bodyTr: '',
      bodyEn: '',
      coverAltTr: '',
      coverAltEn: '',
      status: 'draft',
      publishedAt: '',
      seoTitleTr: '',
      seoTitleEn: '',
      seoDescriptionTr: '',
      seoDescriptionEn: '',
      ogImage: '',
      href: '',
      linksJson: '[]',
      canonicalUrl: '',
    });
  }

  private async loadEntries(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.entries.set(
        await this.api.get<readonly CmsEntry[]>(`/api/admin/content/${this.kind()}`),
      );
    } catch {
      this.error.set('İçerikler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
