import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse, { generateReport } from 'lighthouse';
import { assertTestDatabase, runMigrations } from '../src/server/db.mjs';
import { bootstrapAdmin } from '../src/server/security.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env['TEST_DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required; the quality audit never uses DATABASE_URL.');
}
assertTestDatabase(databaseUrl);

const baseUrl = process.env['AUDIT_BASE_URL'] ?? 'http://127.0.0.1:4321';
const parsedBaseUrl = new URL(baseUrl);
if (
  parsedBaseUrl.protocol !== 'http:' ||
  parsedBaseUrl.hostname !== '127.0.0.1' ||
  !parsedBaseUrl.port
) {
  throw new Error('AUDIT_BASE_URL must use a local HTTP origin such as http://127.0.0.1:4321.');
}
const baseOrigin = parsedBaseUrl.origin;
const port = Number(parsedBaseUrl.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('AUDIT_BASE_URL must contain a valid unprivileged port.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adminEmail = 'quality-audit-admin@example.test';
const adminPassword = randomBytes(32).toString('base64url');
const sessionSecret = randomBytes(48).toString('base64url');
const cacheDirectory = join(repositoryRoot, '.cache');
let uploadDirectory;
let appProcess;
let browser;
let failure;

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

async function isPortAvailable(targetPort) {
  const server = createTcpServer();
  return new Promise((resolvePromise) => {
    server.once('error', () => resolvePromise(false));
    server.listen(targetPort, '127.0.0.1', () => {
      server.close(() => resolvePromise(true));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  let lastError;
  while (Date.now() < deadline) {
    if (appProcess?.exitCode !== null && appProcess?.exitCode !== undefined) {
      throw new Error(`SSR server exited before becoming ready (${appProcess.exitCode}).`);
    }
    try {
      const response = await fetch(`${baseOrigin}/robots.txt`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === 200) return;
      lastError = new Error(`Readiness endpoint returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(`SSR server did not become ready: ${lastError?.message ?? 'timeout'}`);
}

async function assertGzipCompression() {
  const headers = await new Promise((resolvePromise, reject) => {
    const request = httpRequest(
      `${baseOrigin}/`,
      { headers: { 'Accept-Encoding': 'gzip' } },
      (response) => {
        response.resume();
        response.once('end', () => resolvePromise(response.headers));
      },
    );
    request.once('error', reject);
    request.end();
  });
  if (headers['content-encoding'] !== 'gzip') {
    throw new Error(
      `SSR HTML did not use gzip compression (Content-Encoding: ${headers['content-encoding'] ?? 'none'}).`,
    );
  }
  console.log('SSR HTML gzip compression verified.');
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  const exited = new Promise((resolvePromise) => child.once('exit', resolvePromise));
  child.kill('SIGTERM');
  const didExit = await Promise.race([exited.then(() => true), delay(5_000).then(() => false)]);
  if (!didExit && child.exitCode === null) child.kill('SIGKILL');
}

async function seedPublicContent() {
  const entries = [
    {
      kind: 'blog',
      slug: 'a11y-audit-article',
      content: {
        title: { tr: 'Erişilebilirlik denetimi', en: 'Accessibility audit' },
        summary: { tr: 'İzole test yazısı.', en: 'An isolated test article.' },
        body: { tr: 'Test içeriği.', en: 'Test content.' },
        category: { tr: 'Deneme', en: 'Test' },
        tags: [],
        status: 'published',
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    },
    {
      kind: 'lab',
      slug: 'a11y-audit-project',
      content: {
        title: { tr: 'Erişilebilirlik projesi', en: 'Accessibility project' },
        summary: { tr: 'İzole test projesi.', en: 'An isolated test project.' },
        body: { tr: 'Test açıklaması.', en: 'Test description.' },
        status: 'published',
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    },
  ];
  for (const entry of entries) {
    await pool.query(
      `INSERT INTO content_entries (id, kind, slug, content, status, published_at)
       VALUES ($1, $2, $3, $4::jsonb, 'published', now() - interval '1 minute')`,
      [randomUUID(), entry.kind, entry.slug, JSON.stringify(entry.content)],
    );
  }
}

async function runAccessibilityAudit() {
  const env = {
    ...process.env,
    AUDIT_BASE_URL: baseOrigin,
    AUDIT_ADMIN_EMAIL: adminEmail,
    AUDIT_ADMIN_PASSWORD: adminPassword,
  };
  await runProcess(
    process.execPath,
    [
      join(repositoryRoot, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config=playwright.config.mjs',
    ],
    env,
  );
}

async function runLighthouseAudit() {
  const reportDirectory = join(repositoryRoot, 'lighthouse-reports');
  await mkdir(reportDirectory, { recursive: true });
  browser = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const cases = [
    { name: 'home-mobile', path: '/', formFactor: 'mobile' },
    { name: 'blog-mobile', path: '/blog', formFactor: 'mobile' },
    { name: 'home-desktop', path: '/', formFactor: 'desktop' },
  ];
  const expectedScores = {
    performance: 0.85,
    accessibility: 0.95,
    'best-practices': 0.9,
    seo: 0.95,
  };
  const summaries = [];
  const failures = [];

  for (const testCase of cases) {
    const url = new URL(testCase.path, baseOrigin).toString();
    const result = await lighthouse(url, {
      port: browser.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: Object.keys(expectedScores),
      formFactor: testCase.formFactor,
      ...(testCase.formFactor === 'desktop'
        ? {
            screenEmulation: {
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              mobile: false,
              disabled: false,
            },
          }
        : {}),
      throttlingMethod: 'simulate',
    });
    if (!result) throw new Error(`Lighthouse returned no result for ${testCase.name}.`);
    const lhr = result.lhr;
    const json = Array.isArray(result.report) ? result.report[0] : result.report;
    await writeFile(join(reportDirectory, `${testCase.name}.json`), json);
    await writeFile(join(reportDirectory, `${testCase.name}.html`), generateReport(lhr, 'html'));

    const scores = Object.fromEntries(
      Object.keys(expectedScores).map((category) => [
        category,
        lhr.categories[category]?.score ?? 0,
      ]),
    );
    const metrics = {
      lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY,
      tbtMs: lhr.audits['total-blocking-time']?.numericValue ?? Number.POSITIVE_INFINITY,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? Number.POSITIVE_INFINITY,
    };
    const summary = { name: testCase.name, url, formFactor: testCase.formFactor, scores, metrics };
    summaries.push(summary);
    console.log(
      `${testCase.name}: ${Object.entries(scores)
        .map(([name, score]) => `${name} ${(score * 100).toFixed(0)}`)
        .join(
          ' | ',
        )}; LCP ${metrics.lcpMs.toFixed(0)} ms; TBT ${metrics.tbtMs.toFixed(0)} ms; CLS ${metrics.cls.toFixed(3)}`,
    );

    for (const [category, minimum] of Object.entries(expectedScores)) {
      if (scores[category] < minimum) {
        failures.push(
          `${testCase.name}: ${category} ${(scores[category] * 100).toFixed(0)} < ${(minimum * 100).toFixed(0)}`,
        );
      }
    }
    if (metrics.lcpMs > 2_500) failures.push(`${testCase.name}: LCP exceeds 2,500 ms`);
    if (metrics.tbtMs > 200) failures.push(`${testCase.name}: TBT exceeds 200 ms`);
    if (metrics.cls > 0.1) failures.push(`${testCase.name}: CLS exceeds 0.10`);
  }

  await writeFile(join(reportDirectory, 'summary.json'), JSON.stringify(summaries, null, 2));
  if (failures.length) throw new Error(`Lighthouse budgets failed:\n- ${failures.join('\n- ')}`);
}

try {
  if (!(await isPortAvailable(port))) {
    throw new Error(
      `Audit port ${port} is already in use; stop the existing listener or set AUDIT_BASE_URL.`,
    );
  }

  console.log(`Building the quality-audit artifact with PUBLIC_SITE_URL=${baseOrigin}.`);
  await runProcess('npm', ['run', 'build'], {
    ...process.env,
    PUBLIC_SITE_URL: baseOrigin,
  });

  await mkdir(cacheDirectory, { recursive: true, mode: 0o700 });
  uploadDirectory = await mkdtemp(join(cacheDirectory, 'quality-audit-uploads-'));
  await chmod(uploadDirectory, 0o700);
  await runMigrations(pool);
  await pool.query(
    'TRUNCATE admin_users, cms_sessions, content_entries, contact_messages, stored_files, site_settings CASCADE',
  );
  await bootstrapAdmin(pool, { email: adminEmail, password: adminPassword });
  await seedPublicContent();

  appProcess = spawn(process.execPath, [join(repositoryRoot, 'dist/mainsite/server/server.mjs')], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: sessionSecret,
      UPLOAD_DIR: uploadDirectory,
      PUBLIC_SITE_URL: baseOrigin,
    },
    stdio: 'inherit',
  });
  await waitForServer();
  console.log(`Quality audit server ready at ${baseOrigin}; DB name ends in _test.`);
  await assertGzipCompression();
  await runAccessibilityAudit();
  await runLighthouseAudit();
  console.log('Axe/WCAG and Lighthouse quality audits passed.');
} catch (error) {
  failure = error;
} finally {
  if (browser) {
    try {
      await browser.kill();
    } catch (error) {
      failure ??= error;
    }
  }
  await stopProcess(appProcess);
  try {
    await pool.query(
      'TRUNCATE admin_users, cms_sessions, content_entries, contact_messages, stored_files, site_settings CASCADE',
    );
  } catch (error) {
    failure ??= error;
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
