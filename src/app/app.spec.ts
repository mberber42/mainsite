import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { BLOG_POSTS, LAB_PROJECTS, type BlogPost, type LabProject } from './content/public-content';

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
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
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

  it('validates contact fields accessibly and never transmits or stores a message', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageLength = localStorage.length;
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
    expect(page.textContent).not.toContain('Alanlar doğrulandı; mesaj gönderilmedi');

    name.value = 'Mustafa';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    message.value = 'Test message';
    message.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(page.textContent).toContain('Alanlar doğrulandı; mesaj gönderilmedi');
    expect(page.textContent).toContain('hiçbir yere iletilmedi');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(storageLength);
    fetchSpy.mockRestore();
  });
});
