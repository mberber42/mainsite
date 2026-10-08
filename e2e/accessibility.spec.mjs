import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  '/',
  '/hakkimda',
  '/hizmetler',
  '/blog',
  '/blog/a11y-audit-article',
  '/blog/missing-entry',
  '/lab',
  '/lab/a11y-audit-project',
  '/lab/missing-project',
  '/iletisim',
  '/route-does-not-exist',
];
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const outputDirectory = join(process.cwd(), 'test-results', 'axe');

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
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
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    join(outputDirectory, `${safeName(label)}.json`),
    JSON.stringify(report, null, 2),
  );
  expect(
    report.violations,
    `axe violations on ${label}: ${JSON.stringify(report.violations)}`,
  ).toEqual([]);
}

test('public routes pass axe WCAG 2.2 AA in Turkish and English', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    for (const locale of ['tr', 'en']) {
      const currentLocale = await page.locator('html').getAttribute('lang');
      if (currentLocale !== locale) {
        const languageButton =
          locale === 'en'
            ? page.getByRole('button', { name: 'İngilizce diline geç' })
            : page.getByRole('button', { name: 'Switch language to Turkish' });
        await languageButton.click();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
      }
      await audit(page, `public-${route}-${locale}`);
    }
  }
});

test('admin login and authenticated primary screens pass axe WCAG 2.2 AA', async ({ page }) => {
  const email = process.env['AUDIT_ADMIN_EMAIL'];
  const password = process.env['AUDIT_ADMIN_PASSWORD'];
  if (!email || !password) throw new Error('Synthetic audit admin fixture is missing.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await audit(page, 'admin-login');
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Parola').fill(password);
  await page.getByRole('button', { name: 'Oturum aç' }).click();
  await page.waitForURL('**/admin/dashboard');

  for (const route of [
    '/admin/dashboard',
    '/admin/content/blog',
    '/admin/messages',
    '/admin/files',
  ]) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('#main-content')).toBeVisible();
    await audit(page, `admin-${route}`);
  }
});

test('keyboard skip link, reduced motion and 320 px reflow remain usable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scrollBehavior = await page
    .locator('html')
    .evaluate((element) => getComputedStyle(element).scrollBehavior);
  expect(scrollBehavior).toBe('auto');

  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.content,
      `${route} overflows at 320 px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport);
  }
});
