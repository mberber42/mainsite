import { randomBytes, randomUUID } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { assertTestDatabase, runMigrations } from '../src/server/db.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env['TEST_DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required; this audit never reads DATABASE_URL.');
}
assertTestDatabase(databaseUrl);

const auditBaseUrl = process.env['AUDIT_BASE_URL'] ?? 'http://127.0.0.1:4321';
const parsedAuditBase = new URL(auditBaseUrl);
if (
  parsedAuditBase.protocol !== 'http:' ||
  parsedAuditBase.hostname !== '127.0.0.1' ||
  !parsedAuditBase.port
) {
  throw new Error('AUDIT_BASE_URL must use a local HTTP origin such as http://127.0.0.1:4321.');
}
const auditPort = Number(parsedAuditBase.port);
if (!Number.isInteger(auditPort) || auditPort < 1024 || auditPort > 65535) {
  throw new Error('AUDIT_BASE_URL must contain a valid unprivileged port.');
}

const configuredPublicSiteUrl =
  process.env['PUBLIC_SITE_URL'] ?? 'https://mainsite.example.invalid';
const parsedPublicSiteUrl = new URL(configuredPublicSiteUrl);
if (
  parsedPublicSiteUrl.protocol !== 'https:' ||
  parsedPublicSiteUrl.username ||
  parsedPublicSiteUrl.password ||
  parsedPublicSiteUrl.pathname !== '/' ||
  parsedPublicSiteUrl.search ||
  parsedPublicSiteUrl.hash ||
  !parsedPublicSiteUrl.hostname.endsWith('.invalid')
) {
  throw new Error('PUBLIC_SITE_URL must be a reserved HTTPS .invalid origin for isolated audits.');
}
const publicSiteUrl = `${parsedPublicSiteUrl.origin}/`;

const pool = new Pool({ connectionString: databaseUrl });
const sessionSecret = randomBytes(48).toString('base64url');
const cacheDirectory = join(repositoryRoot, '.cache');
let uploadDirectory;
let serverProcess;
let failure;
let ownsTestFixtures = false;
const fixtureIds = [];

function runProcess(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) return resolvePromise();
      reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? code}).`));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  let lastStatus = 'not reachable';
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`SSR server exited before becoming ready (${serverProcess.exitCode}).`);
    }
    try {
      const response = await fetch(`${auditBaseUrl}/robots.txt`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === 200) {
        const body = await response.text();
        if (body.includes(`${publicSiteUrl}sitemap.xml`)) return;
        lastStatus = 'robots.txt does not refer to the configured sitemap origin';
      } else {
        lastStatus = `robots.txt returned HTTP ${response.status}`;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : 'request failed';
    }
    await delay(500);
  }
  throw new Error(`SSR server did not become ready: ${lastStatus}.`);
}

async function seedPublishedContent() {
  const rows = [
    {
      kind: 'blog',
      slug: 'phase4a-seo-article',
      status: 'published',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
      content: {
        title: { tr: 'Erişilebilirlik yazısı', en: 'Accessibility article <unsafe>' },
        summary: { tr: 'Türkçe SEO açıklaması', en: 'English SEO description' },
        body: { tr: 'İçerik.', en: 'Article body.' },
        seoTitle: { tr: 'Özel yazı SEO başlığı', en: 'Custom article SEO title' },
        seoDescription: { tr: 'Özel yazı açıklaması', en: 'Custom article description' },
        ogImage: '/media/article-cover.png',
        canonicalUrl: `${publicSiteUrl}blog/phase4a-seo-article?utm_source=test#top`,
      },
    },
    {
      kind: 'blog',
      slug: 'phase4a-future-article',
      status: 'published',
      publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      content: {
        title: { tr: 'Gelecekteki yazı', en: 'Future article' },
        summary: { tr: 'Gizli', en: 'Not yet public' },
        body: { tr: 'Taslak metni', en: 'Scheduled body' },
      },
    },
    {
      kind: 'blog',
      slug: 'phase4a-draft-article',
      status: 'draft',
      publishedAt: null,
      content: {
        title: { tr: 'Taslak yazı', en: 'Draft article' },
        summary: { tr: 'Yayımlanmamış', en: 'Not published' },
        body: { tr: 'Taslak', en: 'Draft' },
      },
    },
    {
      kind: 'lab',
      slug: 'phase4a-seo-project',
      status: 'published',
      publishedAt: new Date(Date.now() - 60_000).toISOString(),
      content: {
        title: { tr: 'Doğrulanmış proje', en: 'Verified project' },
        summary: { tr: 'Proje açıklaması', en: 'Project summary' },
        body: { tr: 'Proje içeriği', en: 'Project content' },
      },
    },
    {
      kind: 'lab',
      slug: 'phase4a-future-project',
      status: 'published',
      publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      content: {
        title: { tr: 'Gelecekteki proje', en: 'Future project' },
        summary: { tr: 'Gizli', en: 'Not yet public' },
        body: { tr: 'Gelecekte', en: 'Future' },
      },
    },
    {
      kind: 'seo',
      slug: 'home',
      status: 'published',
      publishedAt: null,
      content: {
        title: { tr: 'Ana sayfa SEO kaydı', en: 'Home SEO record' },
        summary: { tr: 'Yedek özet', en: 'Fallback summary' },
        seoTitle: { tr: 'CMS ana sayfa başlığı', en: 'CMS home page title' },
        seoDescription: { tr: 'CMS Türkçe açıklama', en: 'CMS English description' },
      },
    },
  ];
  for (const row of rows) {
    const id = randomUUID();
    fixtureIds.push(id);
    await pool.query(
      `INSERT INTO content_entries (id, kind, slug, content, status, published_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [id, row.kind, row.slug, JSON.stringify(row.content), row.status, row.publishedAt],
    );
  }
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.killed) return;
  const exited = new Promise((resolvePromise) => serverProcess.once('exit', resolvePromise));
  serverProcess.kill('SIGTERM');
  const didExit = await Promise.race([exited.then(() => true), delay(5_000).then(() => false)]);
  if (!didExit && serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
}

try {
  await runMigrations(pool);
  const existingRows = await pool.query(
    `SELECT
       (SELECT count(*) FROM admin_users) +
       (SELECT count(*) FROM cms_sessions) +
       (SELECT count(*) FROM content_entries) +
       (SELECT count(*) FROM contact_messages) +
       (SELECT count(*) FROM stored_files) +
       (SELECT count(*) FROM site_settings) AS total`,
  );
  if (Number(existingRows.rows[0].total) !== 0) {
    throw new Error(
      'SEO audit requires an empty, disposable _test database; existing rows were preserved.',
    );
  }
  ownsTestFixtures = true;
  await seedPublishedContent();

  await mkdir(cacheDirectory, { recursive: true, mode: 0o700 });
  uploadDirectory = await mkdtemp(join(cacheDirectory, 'phase4a-seo-uploads-'));
  await chmod(uploadDirectory, 0o700);

  serverProcess = spawn(
    process.execPath,
    [join(repositoryRoot, 'dist/mainsite/server/server.mjs')],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(auditPort),
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: sessionSecret,
        UPLOAD_DIR: uploadDirectory,
        PUBLIC_SITE_URL: publicSiteUrl,
      },
      stdio: 'inherit',
    },
  );
  await waitForServer();
  console.log(`SSR SEO/accessibility audit server ready; isolated DB name ends in _test.`);

  await runProcess(
    process.execPath,
    [
      join(repositoryRoot, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config=playwright.config.mjs',
    ],
    {
      ...process.env,
      AUDIT_BASE_URL: auditBaseUrl,
      PUBLIC_SITE_URL: publicSiteUrl,
    },
  );
} catch (error) {
  failure = error;
} finally {
  await stopServer();
  if (ownsTestFixtures && fixtureIds.length) {
    await pool
      .query('DELETE FROM content_entries WHERE id = ANY($1::uuid[])', [fixtureIds])
      .catch((error) => {
        failure ??= error;
      });
  }
  await pool.end().catch((error) => {
    failure ??= error;
  });
  if (uploadDirectory) await rm(uploadDirectory, { recursive: true, force: true });
}

if (failure) {
  console.error(failure.stack ?? failure.message ?? failure);
  process.exitCode = 1;
}
