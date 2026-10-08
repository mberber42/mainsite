import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { chmod, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { Pool } from 'pg';
import { assertTestDatabase, runMigrations } from '../src/server/db.mjs';
import { createCmsApp, CONTENT_KINDS } from '../src/server/cms-api.mjs';
import {
  bootstrapAdmin,
  BootstrapAlreadyCompletedError,
  hasAdminAccount,
} from '../src/server/security.mjs';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL is required; production DATABASE_URL is never used for tests.',
  );
assertTestDatabase(databaseUrl);

const pool = new Pool({ connectionString: databaseUrl });
let appClose;
let server;
let secureAppClose;
let secureServer;
let uploadDir;
let unsafeUploadDir;
let baseUrl;
let admin;
let visitor;
const password = randomBytes(24).toString('base64url');

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.cookie) headers.set('Cookie', options.cookie);
  if (options.csrf) headers.set('X-CSRF-Token', options.csrf);
  if (options.origin !== false) headers.set('Origin', options.origin ?? baseUrl);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method ?? 'GET',
    headers,
    body,
    redirect: options.redirect ?? 'manual',
  });
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0] ?? options.cookie ?? null;
  const type = response.headers.get('content-type') ?? '';
  const data = type.includes('application/json') ? await response.json() : null;
  const bytes = type.includes('application/json')
    ? null
    : Buffer.from(await response.arrayBuffer());
  return { response, data, bytes, cookie };
}

function assertAdminFrameHeaders(response) {
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'none'");
}

async function adminRequest(path, options = {}) {
  const result = await request(path, {
    ...options,
    cookie: admin.cookie,
    csrf: options.csrf === undefined ? admin.csrf : options.csrf,
  });
  admin.cookie = result.cookie;
  return result;
}

async function startServer(targetApp) {
  const activeServer = targetApp.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    activeServer.once('listening', resolve);
    activeServer.once('error', reject);
  });
  return activeServer;
}

function postContent(kind, data = {}) {
  return adminRequest(`/api/admin/content/${kind}`, {
    method: 'POST',
    json: {
      title: { tr: `Örnek ${kind}`, en: `Example ${kind}` },
      summary: { tr: 'Kısa özet', en: 'Short summary' },
      body: { tr: '# Güvenli metin', en: '# Safe text' },
      category: { tr: 'Deneme', en: 'Test' },
      tags: [{ tr: 'etiket', en: 'tag' }],
      status: 'draft',
      ...data,
    },
  });
}

async function uploadFile(purpose, bytes, filename, mime) {
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: mime }), filename);
  return adminRequest(`/api/admin/files/${purpose}`, { method: 'POST', body: form });
}

before(async () => {
  await runMigrations(pool);
  await pool.query(
    'TRUNCATE admin_users, cms_sessions, content_entries, contact_messages, stored_files, site_settings',
  );
  uploadDir = await mkdtemp(join(tmpdir(), 'mainsite-cms-test-'));
  const created = await bootstrapAdmin(pool, { email: 'Owner@example.test', password });
  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  assert.equal(created.email, 'owner@example.test');
  assert.equal(await hasAdminAccount(pool), true);
  const stored = await pool.query('SELECT password_hash FROM admin_users WHERE email = $1', [
    'owner@example.test',
  ]);
  assert.match(stored.rows[0].password_hash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(stored.rows[0].password_hash.includes(password), false);
  await assert.rejects(
    bootstrapAdmin(pool, { email: 'other@example.test', password }),
    BootstrapAlreadyCompletedError,
  );

  const createdApp = await createCmsApp({
    pool,
    sessionSecret: randomBytes(48).toString('base64url'),
    uploadDir,
    allowEphemeralUploadDir: true,
    production: false,
  });
  appClose = createdApp.close;
  createdApp.app.use('/admin', (_req, res) => {
    res.type('html').send('<!doctype html><html lang="tr"><body><main>Admin</main></body></html>');
  });
  server = await startServer(createdApp.app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (secureServer) await new Promise((resolve) => secureServer.close(resolve));
  if (secureAppClose) await secureAppClose();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (appClose) await appClose();
  if (unsafeUploadDir) await rm(unsafeUploadDir, { recursive: true, force: true });
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  await pool.query(
    'TRUNCATE admin_users, cms_sessions, content_entries, contact_messages, stored_files, site_settings CASCADE',
  );
  await pool.end();
});

test('PostgreSQL CMS authentication, publishing, CRUD, dashboard, inbox, and local file flows', async () => {
  const uploadMode = (await stat(uploadDir)).mode & 0o777;
  assert.equal(uploadMode & 0o077, 0, 'the existing upload directory is owner-only');
  unsafeUploadDir = await mkdtemp(join(tmpdir(), 'mainsite-cms-unsafe-test-'));
  await chmod(unsafeUploadDir, 0o755);
  await assert.rejects(
    createCmsApp({
      pool,
      sessionSecret: randomBytes(48).toString('base64url'),
      uploadDir: unsafeUploadDir,
      allowEphemeralUploadDir: true,
    }),
    /cms_upload_dir_permissions_unsafe/,
  );

  const adminLoginPage = await request('/admin/login');
  assert.equal(adminLoginPage.response.status, 200);
  assert.match(adminLoginPage.response.headers.get('content-type') ?? '', /text\/html/i);
  assertAdminFrameHeaders(adminLoginPage.response);
  assert.equal(adminLoginPage.response.headers.get('x-robots-tag'), 'noindex, nofollow');
  const unauthedDashboard = await request('/api/admin/dashboard');
  assert.equal(unauthedDashboard.response.status, 401);
  assert.equal(unauthedDashboard.response.headers.get('x-robots-tag'), 'noindex, nofollow');
  const protectedPage = await request('/admin/dashboard');
  assert.equal(protectedPage.response.status, 302);
  assert.equal(protectedPage.response.headers.get('location'), '/admin/login');
  assertAdminFrameHeaders(protectedPage.response);
  assert.equal(
    (await request('/api/auth/signup', { method: 'POST', json: {} })).response.status,
    404,
  );
  assert.equal(
    (await request('/api/admin/files/image', { method: 'POST' })).response.status,
    401,
    'upload authorization is checked before multipart parsing',
  );

  const robots = await request('/robots.txt');
  assert.equal(robots.response.status, 200);
  assert.match(robots.bytes.toString(), /Disallow: \/admin/);
  assert.match(robots.bytes.toString(), /Disallow: \/api\//);
  assert.match(robots.bytes.toString(), new RegExp(`Sitemap: ${baseUrl}\\/sitemap\\.xml`));
  const initialSitemap = await request('/sitemap.xml');
  assert.equal(initialSitemap.response.status, 200);
  assert.match(initialSitemap.response.headers.get('content-type') ?? '', /application\/xml/i);
  assert.match(initialSitemap.bytes.toString(), new RegExp(`<loc>${baseUrl}\\/blog<\\/loc>`));
  assert.doesNotMatch(initialSitemap.bytes.toString(), /\/admin|\/api\//);

  const csrfResponse = await request('/api/auth/csrf');
  assert.equal(csrfResponse.response.status, 200);
  visitor = { cookie: csrfResponse.cookie, csrf: csrfResponse.data.csrfToken };
  const cookieAttributes = csrfResponse.response.headers.get('set-cookie') ?? '';
  assert.match(cookieAttributes, /HttpOnly/i);
  assert.match(cookieAttributes, /SameSite=Strict/i);
  assert.doesNotMatch(cookieAttributes, /Secure/i, 'local HTTP development does not set Secure');

  const missingCsrf = await request('/api/auth/login', {
    method: 'POST',
    cookie: visitor.cookie,
    json: { email: 'owner@example.test', password },
    csrf: 'invalid-token',
  });
  assert.equal(missingCsrf.response.status, 403);
  const wrongOrigin = await request('/api/auth/login', {
    method: 'POST',
    cookie: visitor.cookie,
    csrf: visitor.csrf,
    origin: 'https://attacker.invalid',
    json: { email: 'owner@example.test', password },
  });
  assert.equal(wrongOrigin.response.status, 403);

  const invalidLogin = await request('/api/auth/login', {
    method: 'POST',
    cookie: visitor.cookie,
    csrf: visitor.csrf,
    json: { email: 'owner@example.test', password: 'incorrect test password' },
  });
  assert.equal(invalidLogin.response.status, 401);
  visitor.cookie = invalidLogin.cookie;
  const anonymousSession = await request('/api/auth/session', { cookie: visitor.cookie });
  assert.equal(anonymousSession.data.authenticated, false);

  const login = await request('/api/auth/login', {
    method: 'POST',
    cookie: visitor.cookie,
    csrf: visitor.csrf,
    json: { email: 'OWNER@example.test', password },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.authenticated, true);
  assert.equal(login.data.email, 'owner@example.test');
  assert.notEqual(
    login.cookie,
    visitor.cookie,
    'successful login regenerates the session identifier',
  );
  admin = { cookie: login.cookie, csrf: login.data.csrfToken };
  const adminDashboardPage = await request('/admin/dashboard', { cookie: admin.cookie });
  assert.equal(adminDashboardPage.response.status, 200);
  assert.match(adminDashboardPage.response.headers.get('content-type') ?? '', /text\/html/i);
  assertAdminFrameHeaders(adminDashboardPage.response);
  const authenticatedSession = await adminRequest('/api/auth/session');
  assert.equal(authenticatedSession.data.authenticated, true);
  assert.match(authenticatedSession.data.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(
    (
      await adminRequest('/api/admin/content/blog', {
        method: 'POST',
        json: {},
        csrf: 'invalid-token',
      })
    ).response.status,
    403,
  );

  for (const kind of CONTENT_KINDS) {
    const created = await postContent(kind);
    assert.equal(created.response.status, 201, `${kind} create`);
    assert.equal(created.data.slug, `ornek-${kind}`);
    const publicBeforePublish = await request(`/api/public/content/${kind}`);
    assert.equal(
      publicBeforePublish.data.some((entry) => entry.id === created.data.id),
      false,
      `${kind} draft must remain private`,
    );
    const detail = await adminRequest(`/api/admin/content/${kind}/${created.data.id}`);
    assert.equal(detail.response.status, 200, `${kind} detail`);
    assert.equal(detail.data.summary.tr, 'Kısa özet');
    const update = await adminRequest(`/api/admin/content/${kind}/${created.data.id}`, {
      method: 'PUT',
      json: {
        ...detail.data,
        summary: { tr: 'Güncel özet', en: 'Updated summary' },
        status: 'published',
        publishedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    assert.equal(update.response.status, 200, `${kind} update`);
    const publicAfterPublish = await request(`/api/public/content/${kind}`);
    assert.equal(
      publicAfterPublish.data.some((entry) => entry.id === created.data.id),
      true,
      `${kind} published record`,
    );
    assert.equal(
      publicAfterPublish.data.find((entry) => entry.id === created.data.id).summary.en,
      'Updated summary',
    );
    const draftAgain = await adminRequest(`/api/admin/content/${kind}/${created.data.id}`, {
      method: 'PUT',
      json: { ...update.data, status: 'draft' },
    });
    assert.equal(draftAgain.response.status, 200);
    assert.equal(
      (await request(`/api/public/content/${kind}`)).data.some(
        (entry) => entry.id === created.data.id,
      ),
      false,
    );
    assert.equal(
      (await adminRequest(`/api/admin/content/${kind}/${created.data.id}`, { method: 'DELETE' }))
        .response.status,
      204,
      `${kind} delete`,
    );
  }

  const unsupportedKind = await adminRequest('/api/admin/content/unknown');
  assert.equal(unsupportedKind.response.status, 404);
  const invalidPayload = await adminRequest('/api/admin/content/blog', {
    method: 'POST',
    json: { title: { tr: '', en: '' } },
  });
  assert.equal(invalidPayload.response.status, 400);
  const unsafeMetadata = await postContent('seo', { ogImage: 'javascript:alert(1)' });
  assert.equal(
    unsafeMetadata.response.status,
    400,
    'Open Graph image URLs are restricted to http/https',
  );

  const collisionOne = await postContent('blog', {
    title: { tr: 'Işık Çığlığı', en: 'Light Cry' },
  });
  assert.equal(collisionOne.data.slug, 'isik-cigligi');
  const collisionTwo = await postContent('blog', {
    title: { tr: 'Işık Çığlığı', en: 'Another title' },
  });
  assert.equal(collisionTwo.response.status, 409, 'slug uniqueness is enforced by PostgreSQL');

  const badImage = await uploadFile(
    'image',
    Buffer.from('not an image payload'),
    'cover.png',
    'image/png',
  );
  assert.equal(badImage.response.status, 415, 'declared MIME must match file bytes');
  const notImage = await uploadFile('image', Buffer.from('document'), 'document.txt', 'text/plain');
  assert.equal(notImage.response.status, 415);
  const tooLarge = await uploadFile(
    'image',
    Buffer.alloc(5 * 1024 * 1024 + 1, 1),
    'large.png',
    'image/png',
  );
  assert.equal(tooLarge.response.status, 413);

  const imageBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/KXcAAAAASUVORK5CYII=',
    'base64',
  );
  const imageUpload = await uploadFile('image', imageBytes, 'cover.png', 'image/png');
  assert.equal(imageUpload.response.status, 201);
  assert.equal(
    (await request(imageUpload.data.url)).response.status,
    404,
    'an unpublished/unreferenced image is not public',
  );

  const blog = await postContent('blog', {
    title: { tr: 'Yayımlanan Yazı', en: 'Published Article' },
    summary: { tr: 'Özet', en: 'Summary' },
    body: { tr: 'Türkçe Markdown\n\nİkinci paragraf', en: 'English Markdown\n\nSecond paragraph' },
    category: { tr: 'Geliştirme', en: 'Engineering' },
    tags: [{ tr: 'güvenlik', en: 'security' }],
    coverFileId: imageUpload.data.id,
    coverAlt: { tr: 'Kapak görseli', en: 'Cover image' },
    seoTitle: { tr: 'SEO başlığı', en: 'SEO title' },
    seoDescription: { tr: 'SEO açıklaması', en: 'SEO description' },
    ogImage: imageUpload.data.url,
    canonicalUrl: 'https://example.test/blog/yayimlanan-yazi',
    status: 'published',
    publishedAt: new Date(Date.now() - 60_000).toISOString(),
  });
  assert.equal(blog.response.status, 201);
  assert.equal(blog.data.slug, 'yayimlanan-yazi');
  assert.equal(blog.data.coverImage, imageUpload.data.url);
  assert.equal(blog.data.seoTitle.en, 'SEO title');
  const publicBlog = await request('/api/public/content/blog/yayimlanan-yazi');
  assert.equal(publicBlog.response.status, 200);
  assert.equal(
    publicBlog.data.coverFileId,
    undefined,
    'public API does not expose internal file IDs',
  );
  const publicImage = await request(publicBlog.data.coverImage);
  assert.equal(publicImage.response.status, 200);
  assert.equal(publicImage.response.headers.get('content-type'), 'image/png');
  assert.deepEqual(publicImage.bytes, imageBytes);
  const future = await postContent('blog', {
    title: { tr: 'Gelecek yazısı', en: 'Future Article' },
    status: 'published',
    publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.equal(future.response.status, 201);
  assert.equal(
    (await request('/api/public/content/blog')).data.some((entry) => entry.id === future.data.id),
    false,
  );
  const publishedSitemap = await request('/sitemap.xml');
  const publishedSitemapXml = publishedSitemap.bytes.toString();
  assert.match(publishedSitemapXml, /\/blog\/yayimlanan-yazi/);
  assert.doesNotMatch(publishedSitemapXml, /gelecek-yazisi|taslak-lab-kaydi/);
  assert.doesNotMatch(publishedSitemapXml, /\/admin|\/api\//);
  const lab = await postContent('lab', {
    title: { tr: 'Taslak Lab kaydı', en: 'Draft Lab entry' },
    status: 'draft',
  });
  assert.equal(lab.response.status, 201);
  const sessionsBeforeSeo = Number(
    (await pool.query('SELECT count(*)::int AS total FROM cms_sessions')).rows[0].total,
  );
  const robotsAfterContent = await request('/robots.txt');
  assert.equal(robotsAfterContent.response.status, 200);
  assert.match(robotsAfterContent.bytes.toString(), /Disallow: \/admin/);
  assert.match(robotsAfterContent.bytes.toString(), /Disallow: \/api\//);
  assert.ok(robotsAfterContent.bytes.toString().includes(`Sitemap: ${baseUrl}/sitemap.xml`));
  assert.equal(
    robotsAfterContent.response.headers.get('set-cookie'),
    null,
    'robots does not create a session',
  );
  const forwardedRobots = await request('/robots.txt', {
    headers: {
      'X-Forwarded-Host': 'attacker.example',
      'X-Forwarded-Proto': 'https',
    },
  });
  assert.equal(forwardedRobots.response.status, 200);
  assert.ok(forwardedRobots.bytes.toString().includes(`Sitemap: ${baseUrl}/sitemap.xml`));
  assert.ok(!forwardedRobots.bytes.toString().includes('attacker.example'));

  const sitemapAfterContent = await request('/sitemap.xml');
  assert.equal(sitemapAfterContent.response.status, 200);
  assert.match(sitemapAfterContent.response.headers.get('content-type') ?? '', /application\/xml/i);
  const sitemapXml = sitemapAfterContent.bytes.toString();
  assert.match(sitemapXml, /^<\?xml version="1\.0" encoding="UTF-8"\?><urlset/);
  assert.ok(sitemapXml.includes(`${baseUrl}/blog/yayimlanan-yazi`));
  assert.ok(!sitemapXml.includes(`${baseUrl}/blog/gelecek-yazisi`));
  assert.ok(!sitemapXml.includes(`${baseUrl}/lab/taslak-lab-kaydi`));
  assert.ok(!sitemapXml.includes('/admin'));
  assert.ok(!sitemapXml.includes('/api/'));
  assert.equal(
    sitemapAfterContent.response.headers.get('set-cookie'),
    null,
    'sitemap does not create a session',
  );
  const sessionsAfterSeo = Number(
    (await pool.query('SELECT count(*)::int AS total FROM cms_sessions')).rows[0].total,
  );
  assert.equal(sessionsAfterSeo, sessionsBeforeSeo, 'SEO endpoints do not write session rows');

  assert.equal(
    (await adminRequest(`/api/admin/files/${imageUpload.data.id}`, { method: 'DELETE' })).response
      .status,
    409,
  );

  const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const cvUpload = await uploadFile('cv', pdfBytes, 'resume.pdf', 'application/pdf');
  assert.equal(cvUpload.response.status, 201);
  assert.deepEqual((await request('/api/public/site/cv')).data, { url: cvUpload.data.url });
  const publicCv = await request(cvUpload.data.url);
  assert.equal(publicCv.response.status, 200);
  assert.equal(publicCv.response.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(publicCv.bytes, pdfBytes);
  const uploadedFiles = await readdir(uploadDir);
  assert.equal(uploadedFiles.length, 2, 'files are written as generated local storage keys');

  const contactToken = await request('/api/auth/csrf');
  let contactCookie = contactToken.cookie;
  const rejectedContact = await request('/api/public/contact', {
    method: 'POST',
    cookie: contactCookie,
    csrf: contactToken.data.csrfToken,
    origin: 'https://attacker.invalid',
    json: { name: 'Test', email: 'test@example.test', message: 'Hello there' },
  });
  assert.equal(rejectedContact.response.status, 403);
  const firstMessage = await request('/api/public/contact', {
    method: 'POST',
    cookie: contactCookie,
    csrf: contactToken.data.csrfToken,
    json: {
      name: 'Ada',
      email: 'ada@example.test',
      message: 'Please contact me about this project.',
    },
  });
  assert.equal(firstMessage.response.status, 201);
  contactCookie = firstMessage.cookie;
  await new Promise((resolve) => setTimeout(resolve, 5));
  const secondMessage = await request('/api/public/contact', {
    method: 'POST',
    cookie: contactCookie,
    csrf: contactToken.data.csrfToken,
    json: {
      name: 'Grace',
      email: 'grace@example.test',
      message: 'I would like to discuss the portfolio.',
    },
  });
  assert.equal(secondMessage.response.status, 201);
  const messages = await adminRequest('/api/admin/messages');
  assert.equal(messages.response.status, 200);
  assert.equal(messages.data.length, 2);
  assert.equal(messages.data[0].id, secondMessage.data.id, 'inbox sorts newest messages first');
  const openedMessage = await adminRequest(`/api/admin/messages/${firstMessage.data.id}`);
  assert.equal(openedMessage.data.read_at, null, 'message detail GET does not mutate read state');
  const unread = await adminRequest(`/api/admin/messages/${firstMessage.data.id}/read`, {
    method: 'PATCH',
    json: { read: false },
  });
  assert.equal(unread.data.read_at, null);
  const read = await adminRequest(`/api/admin/messages/${firstMessage.data.id}/read`, {
    method: 'PATCH',
    json: { read: true },
  });
  assert.ok(read.data.read_at);
  const archived = await adminRequest(`/api/admin/messages/${firstMessage.data.id}/archive`, {
    method: 'PATCH',
    json: { archived: true },
  });
  assert.ok(archived.data.archived_at);
  assert.equal((await adminRequest('/api/admin/messages')).data.length, 1);
  assert.equal((await adminRequest('/api/admin/messages?archived=true')).data.length, 2);
  const dashboard = await adminRequest('/api/admin/dashboard');
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.data.blogTotal, 3);
  assert.equal(dashboard.data.labTotal, 1);
  assert.equal(dashboard.data.publishedTotal, 1);
  assert.equal(dashboard.data.draftTotal, 3);
  assert.equal(dashboard.data.unreadMessages, 1);
  assert.equal(dashboard.data.recentMessages.length, 1);
  assert.equal(
    (await adminRequest(`/api/admin/messages/${firstMessage.data.id}`, { method: 'DELETE' }))
      .response.status,
    204,
  );
  assert.equal(
    (await adminRequest(`/api/admin/messages/${secondMessage.data.id}`, { method: 'DELETE' }))
      .response.status,
    204,
  );

  const secureCreated = await createCmsApp({
    pool,
    sessionSecret: randomBytes(48).toString('base64url'),
    uploadDir,
    allowEphemeralUploadDir: true,
    production: true,
    trustProxy: true,
  });
  secureAppClose = secureCreated.close;
  secureServer = await startServer(secureCreated.app);
  const secureUrl = `http://127.0.0.1:${secureServer.address().port}`;
  const secureResponse = await fetch(`${secureUrl}/api/auth/csrf`, {
    headers: {
      'X-Forwarded-Proto': 'https',
      Origin: `https://127.0.0.1:${secureServer.address().port}`,
    },
  });
  assert.equal(secureResponse.status, 200);
  assert.match(
    secureResponse.headers.get('set-cookie') ?? '',
    /Secure/i,
    'production HTTPS cookies are Secure',
  );

  const burstIp = '203.0.113.77';
  const sessionCountBefore = Number(
    (await pool.query('SELECT count(*) FROM cms_sessions')).rows[0].count,
  );
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const path = attempt % 2 === 0 ? '/api/auth/csrf' : '/api/auth/session';
    const response = await fetch(new URL(path, secureUrl), {
      headers: {
        'X-Forwarded-For': burstIp,
        'X-Forwarded-Proto': 'https',
        Origin: `https://127.0.0.1:${secureServer.address().port}`,
      },
    });
    assert.equal(response.status, 200, `anonymous session attempt ${attempt + 1}`);
    assert.ok(response.headers.get('set-cookie'), 'accepted anonymous session is persisted');
    if (path.endsWith('/session')) assert.equal((await response.json()).authenticated, false);
  }
  const blockedAnonymousSession = await fetch(new URL('/api/auth/csrf', secureUrl), {
    headers: {
      'X-Forwarded-For': burstIp,
      'X-Forwarded-Proto': 'https',
      Origin: `https://127.0.0.1:${secureServer.address().port}`,
    },
  });
  assert.equal(blockedAnonymousSession.status, 429);
  assert.equal(
    blockedAnonymousSession.headers.get('set-cookie'),
    null,
    'rate-limited anonymous GET does not persist or issue a session',
  );
  const sessionCountAfter = Number(
    (await pool.query('SELECT count(*) FROM cms_sessions')).rows[0].count,
  );
  assert.equal(sessionCountAfter - sessionCountBefore, 20);

  assert.equal(
    (await adminRequest(`/api/admin/files/${cvUpload.data.id}`, { method: 'DELETE' })).response
      .status,
    204,
  );
  assert.equal((await request(cvUpload.data.url)).response.status, 404);
  assert.deepEqual((await request('/api/public/site/cv')).data, { url: null });
  assert.equal(
    (await adminRequest(`/api/admin/content/blog/${blog.data.id}`, { method: 'DELETE' })).response
      .status,
    204,
  );
  assert.equal(
    (await adminRequest(`/api/admin/content/blog/${future.data.id}`, { method: 'DELETE' })).response
      .status,
    204,
  );
  assert.equal(
    (await adminRequest(`/api/admin/content/blog/${collisionOne.data.id}`, { method: 'DELETE' }))
      .response.status,
    204,
  );
  assert.equal(
    (await adminRequest(`/api/admin/content/lab/${lab.data.id}`, { method: 'DELETE' })).response
      .status,
    204,
  );
  assert.equal(
    (await adminRequest(`/api/admin/files/${imageUpload.data.id}`, { method: 'DELETE' })).response
      .status,
    204,
  );
  assert.equal(
    (await readdir(uploadDir)).length,
    0,
    'deleting unreferenced local files removes their storage objects',
  );

  const logout = await adminRequest('/api/auth/logout', { method: 'POST' });
  assert.equal(logout.response.status, 204);
  assert.equal(
    (await request('/api/admin/dashboard', { cookie: admin.cookie })).response.status,
    401,
  );
  const pageAfterLogout = await request('/admin/dashboard', { cookie: admin.cookie });
  assert.equal(pageAfterLogout.response.status, 302);
  assertAdminFrameHeaders(pageAfterLogout.response);
});
