import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicSiteUrl = process.env['PUBLIC_SITE_URL'] ?? 'https://mainsite.example.invalid';
const auditOutputDirectory = join(process.cwd(), 'test-results', 'axe');
const publicRoutes = [
  '/',
  '/hakkimda',
  '/hizmetler',
  '/blog',
  '/blog/phase4a-seo-article',
  '/blog/missing-phase4a-article',
  '/lab',
  '/lab/phase4a-seo-project',
  '/lab/missing-phase4a-project',
  '/iletisim',
  '/route-does-not-exist',
];
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
}

function publicUrl(path) {
  return new URL(path, publicSiteUrl).toString();
}

async function audit(page, label) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const report = {
    url: page.url(),
    label,
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        failureSummary: node.failureSummary,
      })),
    })),
  };
  await mkdir(auditOutputDirectory, { recursive: true });
  await writeFile(
    join(auditOutputDirectory, `${safeName(label)}.json`),
    JSON.stringify(report, null, 2),
  );
  const blocking = report.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact),
  );
  expect(
    blocking,
    `critical/serious axe violations on ${label}: ${JSON.stringify(blocking)}`,
  ).toEqual([]);
  console.log(
    `${label}: ${report.violations.length} axe violations; ${blocking.length} critical/serious.`,
  );
}

async function setLocale(page, locale) {
  const currentLocale = await page.locator('html').getAttribute('lang');
  if (currentLocale === locale) return;
  const buttonName = locale === 'en' ? 'İngilizce diline geç' : 'Switch language to Turkish';
  await page.getByRole('button', { name: buttonName }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

test('SSR metadata, localized CMS precedence, canonical URLs, and JSON-LD are correct', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const routeExpectations = [
    { path: '/', title: 'CMS ana sayfa başlığı', description: 'CMS Türkçe açıklama' },
    { path: '/hakkimda', title: 'Hakkımda | Mustafa BERBER' },
    { path: '/hizmetler', title: 'Hizmetler | Mustafa BERBER' },
    { path: '/blog', title: 'Blog | Mustafa BERBER' },
    { path: '/lab', title: 'Lab | Mustafa BERBER' },
    { path: '/iletisim', title: 'İletişim formu | Mustafa BERBER' },
  ];

  for (const route of routeExpectations) {
    const response = await page.goto(route.path, { waitUntil: 'networkidle' });
    expect(response?.status(), `${route.path} SSR status`).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle(route.title);
    if (route.description) {
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        route.description,
      );
    }
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', route.title);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'tr_TR');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      route.title,
    );
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim()).toBeTruthy();
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      description ?? '',
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      'content',
      description ?? '',
    );
    const canonical = publicUrl(route.path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute('content', canonical);

    await setLocale(page, 'en');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      await page.title(),
    );
    await setLocale(page, 'tr');
  }

  const blogResponse = await page.goto('/blog/phase4a-seo-article', { waitUntil: 'networkidle' });
  expect(blogResponse?.status()).toBe(200);
  await expect(page).toHaveTitle('Özel yazı SEO başlığı | Mustafa BERBER');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    'Özel yazı açıklaması',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    publicUrl('/media/article-cover.png'),
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    publicUrl('/blog/phase4a-seo-article'),
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    publicUrl('/blog/phase4a-seo-article'),
  );
  await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute(
    'content',
    publicUrl('/blog/phase4a-seo-article'),
  );
  await expect(page.locator('meta[name="article:published_time"]')).toHaveCount(0);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
    'content',
    /.+/,
  );
  const schemaText = await page.locator('script[data-seo-jsonld]').textContent();
  expect(schemaText).not.toContain('<unsafe>');
  expect(await page.locator('script[data-seo-jsonld]').count()).toBe(1);
  const schema = JSON.parse(schemaText ?? '{}');
  expect(schema['@context']).toBe('https://schema.org');
  expect(schema['@graph']).toContainEqual(
    expect.objectContaining({ '@type': 'BlogPosting', headline: 'Erişilebilirlik yazısı' }),
  );
  expect(JSON.stringify(schema)).not.toMatch(/mustafa@example|telephone|sameAs|address/i);

  await setLocale(page, 'en');
  await expect(page).toHaveTitle('Custom article SEO title | Mustafa BERBER');
  const englishSchemaText = await page.locator('script[data-seo-jsonld]').textContent();
  const englishSchema = JSON.parse(englishSchemaText ?? '{}');
  expect(englishSchema['@graph']).toContainEqual(
    expect.objectContaining({ '@type': 'BlogPosting', headline: 'Accessibility article <unsafe>' }),
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    'Custom article description',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    publicUrl('/blog/phase4a-seo-article'),
  );

  const labResponse = await page.goto('/lab/phase4a-seo-project', { waitUntil: 'networkidle' });
  expect(labResponse?.status()).toBe(200);
  await setLocale(page, 'en');
  await expect(page).toHaveTitle('Verified project | Mustafa BERBER');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Project summary',
  );
  const labSchema = JSON.parse(
    (await page.locator('script[data-seo-jsonld]').textContent()) ?? '{}',
  );
  const creativeWork = labSchema['@graph'].find((node) => node['@type'] === 'CreativeWork');
  expect(creativeWork).toEqual(
    expect.objectContaining({ headline: 'Verified project', inLanguage: 'en' }),
  );
  expect(creativeWork.author).toBeUndefined();
  expect(JSON.stringify(labSchema)).not.toMatch(/mustafa@example|telephone|sameAs|address/i);

  const missingResponse = await page.goto('/blog/missing-phase4a-article', {
    waitUntil: 'networkidle',
  });
  expect(missingResponse?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');

  const adminResponse = await page.goto('/admin/login', { waitUntil: 'networkidle' });
  expect(adminResponse?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  expect(adminResponse?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  const publicApiResponse = await request.get('/api/public/content/blog');
  expect(publicApiResponse.status()).toBe(200);
  expect(publicApiResponse.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('robots and sitemap exclude admin, APIs, drafts, and future content', async ({
  request,
  page,
}) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Disallow: /api/');
  expect(robots).toContain(`Sitemap: ${publicUrl('/sitemap.xml')}`);

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  expect(sitemapResponse.headers()['content-type']).toContain('application/xml');
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(publicUrl('/'));
  expect(sitemap).toContain(publicUrl('/blog/phase4a-seo-article'));
  expect(sitemap).toContain(publicUrl('/lab/phase4a-seo-project'));
  expect(sitemap).not.toContain('phase4a-future-article');
  expect(sitemap).not.toContain('phase4a-draft-article');
  expect(sitemap).not.toContain('phase4a-future-project');
  expect(sitemap).not.toContain('/admin');
  expect(sitemap).not.toContain('/api/');
  const sitemapData = await page.evaluate((xml) => {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    return {
      hasParserError: Boolean(parsed.querySelector('parsererror')),
      entries: Array.from(parsed.querySelectorAll('url')).map((entry) => ({
        location: entry.querySelector('loc')?.textContent ?? '',
        lastmod: entry.querySelector('lastmod')?.textContent ?? '',
      })),
    };
  }, sitemap);
  expect(sitemapData.hasParserError).toBe(false);
  expect(sitemapData.entries).toHaveLength(8);
  expect(sitemapData.entries.every((entry) => entry.location.startsWith(publicUrl('/')))).toBe(
    true,
  );
  expect(
    sitemapData.entries.every(
      (entry) => !entry.lastmod || !Number.isNaN(Date.parse(entry.lastmod)),
    ),
  ).toBe(true);
  expect(robotsResponse.headers()['set-cookie']).toBeUndefined();
  expect(sitemapResponse.headers()['set-cookie']).toBeUndefined();
});

test('public routes pass axe WCAG 2.2 AA and best-practice scans in Turkish and English', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    for (const locale of ['tr', 'en']) {
      await setLocale(page, locale);
      await audit(page, `public-${route}-${locale}`);
    }
  }
});

test('keyboard skip link, reduced motion, and public-page reflow work at 320px', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');

  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${route} overflows at 320px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }
});
