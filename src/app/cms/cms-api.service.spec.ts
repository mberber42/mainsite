import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CmsApiService } from './cms-api.service';

describe('CmsApiService Lab SEO adapters', () => {
  let service: CmsApiService;
  let http: HttpTestingController;

  const labEntry = {
    id: 'lab-seo-1',
    kind: 'lab' as const,
    slug: 'localized-seo-project',
    status: 'published' as const,
    publishedAt: null,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
    title: { tr: 'Proje başlığı', en: 'Project title' },
    summary: { tr: 'Proje özeti', en: 'Project summary' },
    body: { tr: 'Proje içeriği', en: 'Project content' },
    seoTitle: { tr: 'Özel SEO başlığı', en: 'Custom SEO title' },
    seoDescription: { tr: 'Özel SEO açıklaması', en: 'Custom SEO description' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CmsApiService],
    });
    service = TestBed.inject(CmsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preserves localized SEO overrides in both list and detail adapters', () => {
    let listResult: readonly import('../content/public-content').LabProject[] | null = null;
    service.labProjects().subscribe((value) => (listResult = value));
    http.expectOne('/api/public/content/lab').flush([labEntry]);

    expect(listResult?.[0]).toMatchObject({
      seoTitle: { tr: 'Özel SEO başlığı', en: 'Custom SEO title' },
      seoDescription: { tr: 'Özel SEO açıklaması', en: 'Custom SEO description' },
    });

    let detailResult: import('../content/public-content').LabProject | null = null;
    service.labProject(labEntry.slug).subscribe((value) => (detailResult = value));
    http.expectOne('/api/public/content/lab/localized-seo-project').flush(labEntry);

    expect(detailResult).toMatchObject({
      seoTitle: { tr: 'Özel SEO başlığı', en: 'Custom SEO title' },
      seoDescription: { tr: 'Özel SEO açıklaması', en: 'Custom SEO description' },
    });
  });
});
