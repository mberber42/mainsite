import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { BLOG_POSTS, LAB_PROJECTS, type BlogPost, type LabProject } from './content/public-content';
import { CmsApiService } from './cms/cms-api.service';
import { of } from 'rxjs';

const cmsApiStub = {
  entries: vi.fn(() => of(null)),
  entry: vi.fn(() => of(null)),
  blogPosts: vi.fn(() => of(null)),
  blogPost: vi.fn(() => of(null)),
  labProjects: vi.fn(() => of(null)),
  labProject: vi.fn(() => of(null)),
  cvUrl: vi.fn(() => of(null)),
  mutate: vi.fn().mockResolvedValue({ id: 'test-message-id' }),
} as unknown as CmsApiService;

const bilingualRoutes = [
  { path: '/hakkimda', tr: 'Hakkımda', en: 'About' },
  { path: '/hizmetler', tr: 'Hizmetler', en: 'Services' },
  { path: '/blog', tr: 'Blog', en: 'Blog' },
  { path: '/blog/missing-entry', tr: 'Bu yazı bulunamadı', en: 'Article not found' },
  { path: '/lab', tr: 'Lab', en: 'Lab' },
  { path: '/lab/missing-project', tr: 'Bu Lab kaydı bulunamadı', en: 'Lab entry not found' },
  { path: '/iletisim', tr: 'İletişim formu', en: 'Contact form' },
  {
    path: '/route-does-not-exist',
    tr: 'Aradığınız sayfa burada değil.',
    en: 'The page you are looking for is not here.',
  },
] as const;

async function createApp() {
  const fixture = TestBed.createComponent(App);
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, router, page: fixture.nativeElement as HTMLElement };
}

describe('public routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: CmsApiService, useValue: cmsApiStub }],
    }).compileComponents();
  });

  it('renders the Turkish home page by default and updates the document language', async () => {
    const { fixture, page } = await createApp();

    expect(page.querySelector('h1')?.textContent).toContain('Mustafa BERBER');
    expect(page.querySelector('[data-testid="hero-value"]')?.textContent).toContain(
      'Dijital ürünler',
    );
    expect(document.documentElement.lang).toBe('tr');

    page.querySelector<HTMLButtonElement>('[aria-label="İngilizce diline geç"]')?.click();
    fixture.detectChanges();

    expect(page.querySelector('[data-testid="hero-value"]')?.textContent).toContain(
      'I build digital products',
    );
    expect(document.documentElement.lang).toBe('en');
  });

  it('opens every requested route family and localizes it without changing the current URL', async () => {
    const { fixture, router, page } = await createApp();

    for (const route of bilingualRoutes) {
      await router.navigateByUrl(route.path);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(page.querySelector('h1')?.textContent).toContain(route.tr);
      expect(document.documentElement.lang).toBe('tr');

      page.querySelector<HTMLButtonElement>('[aria-label="İngilizce diline geç"]')?.click();
      fixture.detectChanges();

      expect(page.querySelector('h1')?.textContent).toContain(route.en);
      expect(document.documentElement.lang).toBe('en');
      expect(router.url).toBe(route.path);

      page.querySelector<HTMLButtonElement>('[aria-label="Switch language to Turkish"]')?.click();
      fixture.detectChanges();
      expect(page.querySelector('h1')?.textContent).toContain(route.tr);
      expect(document.documentElement.lang).toBe('tr');
    }
  });

  it('keeps route navigation available in both header and footer', async () => {
    const { fixture, router, page } = await createApp();
    const aboutLink = page.querySelector<HTMLAnchorElement>('.site-nav a[href="/hakkimda"]');

    expect(aboutLink).not.toBeNull();
    aboutLink?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/hakkimda');
    expect(page.querySelector('h1')?.textContent).toContain('Hakkımda');

    expect(page.querySelector('.site-footer a[href="/iletisim"]')).not.toBeNull();
  });

  it('shows bilingual empty states for local blog and Lab data', async () => {
    const { fixture, router, page } = await createApp();

    await router.navigateByUrl('/blog');
    fixture.detectChanges();
    expect(page.textContent).toContain('Henüz yayımlanmış yazı yok');
    await router.navigateByUrl('/lab');
    fixture.detectChanges();
    expect(page.textContent).toContain('Henüz Lab kaydı yok');
  });

  it('uses each Blog and Lab cover alt in the selected locale in list and detail views', async () => {
    const blogPosts = BLOG_POSTS as unknown as BlogPost[];
    const labProjects = LAB_PROJECTS as unknown as LabProject[];
    const initialBlogPostsLength = blogPosts.length;
    const initialLabProjectsLength = labProjects.length;
    blogPosts.push({
      slug: 'cover-alt-review',
      title: { tr: 'Test yazısı', en: 'Test article' },
      summary: { tr: 'Test özeti', en: 'Test summary' },
      body: [],
      coverImage: '/test-blog-cover.png',
      coverAlt: { tr: 'Yazı kapağının Türkçe açıklaması', en: 'Blog cover description in English' },
    });
    labProjects.push({
      slug: 'cover-alt-review',
      title: { tr: 'Test projesi', en: 'Test project' },
      summary: { tr: 'Test özeti', en: 'Test summary' },
      description: [],
      coverImage: '/test-lab-cover.png',
      coverAlt: { tr: 'Proje kapağının Türkçe açıklaması', en: 'Lab cover description in English' },
    });

    try {
      const { fixture, router, page } = await createApp();
      const coverRoutes = [
        {
          path: '/blog',
          tr: 'Yazı kapağının Türkçe açıklaması',
          en: 'Blog cover description in English',
        },
        {
          path: '/blog/cover-alt-review',
          tr: 'Yazı kapağının Türkçe açıklaması',
          en: 'Blog cover description in English',
        },
        {
          path: '/lab',
          tr: 'Proje kapağının Türkçe açıklaması',
          en: 'Lab cover description in English',
        },
        {
          path: '/lab/cover-alt-review',
          tr: 'Proje kapağının Türkçe açıklaması',
          en: 'Lab cover description in English',
        },
      ] as const;

      for (const route of coverRoutes) {
        await router.navigateByUrl(route.path);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(page.querySelector<HTMLImageElement>('img')?.alt).toBe(route.tr);

        if (route.path === '/blog' || route.path === '/lab') {
          expect(page.querySelector('.content-grid')?.hasAttribute('aria-label')).toBe(false);
        }

        page.querySelector<HTMLButtonElement>('[aria-label="İngilizce diline geç"]')?.click();
        fixture.detectChanges();
        expect(page.querySelector<HTMLImageElement>('img')?.alt).toBe(route.en);
        expect(router.url).toBe(route.path);
        page.querySelector<HTMLButtonElement>('[aria-label="Switch language to Turkish"]')?.click();
        fixture.detectChanges();
      }
    } finally {
      blogPosts.splice(initialBlogPostsLength);
      labProjects.splice(initialLabProjectsLength);
    }
  });

  it('renders Markdown while Angular sanitizes unsafe HTML, handlers, and javascript links', async () => {
    const blogPosts = BLOG_POSTS as unknown as BlogPost[];
    const initialLength = blogPosts.length;
    blogPosts.push({
      slug: 'markdown-sanitizer-check',
      title: { tr: 'Güvenli Markdown', en: 'Safe Markdown' },
      summary: { tr: 'Özet', en: 'Summary' },
      body: [],
      bodyMarkdown: {
        tr: '**Kalın metin**\n\n<script>alert(1)</script><img src=x onerror=alert(1)> [tehlikeli](javascript:alert(1))',
        en: '**Bold text**\n\n<script>alert(1)</script><img src=x onerror=alert(1)> [unsafe](javascript:alert(1))',
      },
    });
    try {
      const { fixture, router, page } = await createApp();
      await router.navigateByUrl('/blog/markdown-sanitizer-check');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const rendered = page.querySelector('.detail-article__body');
      expect(rendered?.querySelector('strong')?.textContent).toContain('Kalın metin');
      expect(rendered?.querySelector('script')).toBeNull();
      expect(rendered?.querySelector('[onerror]')).toBeNull();
      const remainingHrefs = Array.from(rendered?.querySelectorAll('a') ?? []).map(
        (anchor) => anchor.getAttribute('href')?.toLowerCase() ?? '',
      );
      expect(remainingHrefs.every((href) => !href.startsWith('javascript:'))).toBe(true);
    } finally {
      blogPosts.splice(initialLength);
    }
  });

  it('validates contact fields accessibly and sends valid messages to the server-side inbox', async () => {
    const { fixture, router, page } = await createApp();
    await router.navigateByUrl('/iletisim');
    fixture.detectChanges();

    page.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
    fixture.detectChanges();
    expect(page.querySelector('#name-error')?.textContent).toContain('zorunludur');
    expect(page.querySelector('#email-error')?.textContent).toContain('zorunludur');
    expect(page.querySelector('#message-error')?.textContent).toContain('zorunludur');
    expect(page.querySelector('#contact-name')?.getAttribute('aria-invalid')).toBe('true');

    const name = page.querySelector<HTMLInputElement>('#contact-name');
    const email = page.querySelector<HTMLInputElement>('#contact-email');
    const message = page.querySelector<HTMLTextAreaElement>('#contact-message');
    if (!name || !email || !message) {
      throw new Error('Expected contact form controls to render.');
    }
    name.value = 'Mustafa';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    email.value = 'not-an-email';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    message.value = 'Test message';
    message.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
    fixture.detectChanges();
    expect(page.querySelector('#email-error')?.textContent).toContain('Geçerli bir e-posta');

    email.value = 'mustafa@example.test';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    name.value = '   ';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    message.value = ' \n\t ';
    message.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
    fixture.detectChanges();
    expect(page.querySelector('#name-error')?.textContent).toContain('zorunludur');
    expect(page.querySelector('#message-error')?.textContent).toContain('zorunludur');
    expect(page.textContent).not.toContain('Mesajınız gönderildi');

    name.value = 'Mustafa';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    message.value = 'Test message';
    message.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.textContent).toContain('Mesajınız gönderildi');
    expect(cmsApiStub.mutate).toHaveBeenCalledWith('POST', '/api/public/contact', {
      name: 'Mustafa',
      email: 'mustafa@example.test',
      message: 'Test message',
    });
  });
});
