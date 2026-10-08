import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { access, mkdir, readFile, realpath, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import multer from 'multer';
import { Pool } from 'pg';
import { fixedWindowAllow, pruneExpiredThrottleEntries } from './rate-limit.mjs';
import { authenticateAdmin } from './security.mjs';

const CONTENT_KINDS = new Set([
  'blog',
  'lab',
  'services',
  'faqs',
  'testimonials',
  'social-links',
  'hero',
  'seo',
]);
const MAX_JSON_BYTES = '256kb';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CV_BYTES = 8 * 1024 * 1024;
const COOKIE_NAME = 'mainsite.sid';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const ANONYMOUS_SESSION_WINDOW_MS = 60 * 1000;
const ANONYMOUS_SESSION_MAX_ATTEMPTS = 20;
const CONTACT_WINDOW_MS = 60 * 1000;
const CONTACT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();
const anonymousSessionAttempts = new Map();
const contactAttempts = new Map();
const throttleAttemptMaps = [loginAttempts, anonymousSessionAttempts, contactAttempts];
const throttleCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const attempts of throttleAttemptMaps) pruneExpiredThrottleEntries(attempts, now);
}, 60 * 1000);
throttleCleanupTimer.unref();

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function fail(status, code) {
  throw new HttpError(status, code);
}

function slugify(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function localized(value, field, { required = false } = {}) {
  let tr;
  let en;
  if (typeof value === 'string') {
    tr = value.trim();
    en = value.trim();
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    tr = typeof value.tr === 'string' ? value.tr.trim() : '';
    en = typeof value.en === 'string' ? value.en.trim() : '';
  } else {
    tr = '';
    en = '';
  }
  if (required && (!tr || !en)) fail(400, `${field}_required`);
  if (tr.length > 20_000 || en.length > 20_000) fail(400, `${field}_too_long`);
  return { tr, en };
}

function safeRecord(row, { publicView = false } = {}) {
  const item = {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row.content,
  };
  if (item.coverFileId) item.coverImage = `/api/public/files/${item.coverFileId}`;
  if (publicView) {
    delete item.coverFileId;
    delete item.internalNotes;
    delete item.createdBy;
  }
  return item;
}

function normalizeContent(body, existing) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'invalid_content');
  const title = localized(body.title ?? existing?.title, 'title', { required: true });
  const summary = localized(body.summary ?? existing?.summary ?? '', 'summary');
  const description = localized(body.description ?? existing?.description ?? '', 'description');
  const category = localized(body.category ?? existing?.category ?? '', 'category');
  const coverAlt = localized(body.coverAlt ?? existing?.coverAlt ?? '', 'coverAlt');
  const seoTitle = localized(body.seoTitle ?? existing?.seoTitle ?? '', 'seoTitle');
  const seoDescription = localized(
    body.seoDescription ?? existing?.seoDescription ?? '',
    'seoDescription',
  );
  const bodyText = localized(body.body ?? existing?.body ?? '', 'body');
  let tags = body.tags ?? existing?.tags ?? [];
  if (typeof tags === 'string')
    tags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  if (!Array.isArray(tags) || tags.length > 50) fail(400, 'invalid_tags');
  tags = tags.map((tag) => localized(tag, 'tag', { required: true }));
  let links = body.links ?? existing?.links ?? [];
  if (!Array.isArray(links) || links.length > 20) fail(400, 'invalid_links');
  links = links.map((link) => {
    if (!link || typeof link !== 'object') fail(400, 'invalid_link');
    const label = localized(link.label, 'link_label', { required: true });
    const href = typeof link.href === 'string' ? link.href.trim() : '';
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      fail(400, 'invalid_link_url');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) fail(400, 'invalid_link_url');
    return { label, href: parsed.toString() };
  });
  const coverFileId = body.coverFileId ?? existing?.coverFileId ?? null;
  if (coverFileId !== null && !/^[0-9a-f-]{36}$/i.test(String(coverFileId))) {
    fail(400, 'invalid_cover_file');
  }
  const canonicalUrl =
    typeof (body.canonicalUrl ?? existing?.canonicalUrl) === 'string'
      ? (body.canonicalUrl ?? existing?.canonicalUrl).trim()
      : '';
  if (canonicalUrl) {
    let url;
    try {
      url = new URL(canonicalUrl);
    } catch {
      fail(400, 'invalid_canonical_url');
    }
    if (!['http:', 'https:'].includes(url.protocol)) fail(400, 'invalid_canonical_url');
  }
  const ogImage =
    typeof (body.ogImage ?? existing?.ogImage) === 'string'
      ? (body.ogImage ?? existing?.ogImage).trim()
      : '';
  const safeSitePath =
    ogImage.startsWith('/') && !ogImage.startsWith('//') && !ogImage.includes('\\');
  if (ogImage && !safeSitePath) {
    let imageUrl;
    try {
      imageUrl = new URL(ogImage);
    } catch {
      fail(400, 'invalid_og_image_url');
    }
    if (!['http:', 'https:'].includes(imageUrl.protocol)) fail(400, 'invalid_og_image_url');
  }
  const href =
    typeof (body.href ?? existing?.href) === 'string' ? (body.href ?? existing?.href).trim() : '';
  if (href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      fail(400, 'invalid_link_url');
    }
    if (!['http:', 'https:'].includes(url.protocol)) fail(400, 'invalid_link_url');
  }
  const readingMinutes = body.readingMinutes ?? existing?.readingMinutes ?? null;
  if (
    readingMinutes !== null &&
    (!Number.isInteger(Number(readingMinutes)) ||
      Number(readingMinutes) < 1 ||
      Number(readingMinutes) > 999)
  ) {
    fail(400, 'invalid_reading_minutes');
  }
  return {
    title,
    summary,
    description,
    body: bodyText,
    category,
    tags,
    links,
    coverAlt,
    coverFileId,
    seoTitle,
    seoDescription,
    ogImage,
    href,
    canonicalUrl,
    readingMinutes: readingMinutes === null ? null : Number(readingMinutes),
  };
}

function getSlug(body, content, existing) {
  const submitted = typeof body.slug === 'string' ? body.slug.trim() : '';
  const generated = slugify(
    submitted || content.title.tr || content.title.en || existing?.slug || '',
  );
  if (!generated) fail(400, 'invalid_slug');
  return generated;
}

function parsePublishedAt(value, status, existing) {
  if (value === undefined && existing) return existing.published_at;
  if (value === undefined || value === null || value === '') {
    return status === 'published' ? new Date().toISOString() : null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(400, 'invalid_published_at');
  return date.toISOString();
}

function validateRuntimeConfig(config) {
  if (!config.pool && !config.databaseUrl) fail(503, 'cms_database_not_configured');
  if (!config.sessionSecret || Buffer.byteLength(config.sessionSecret, 'utf8') < 32) {
    fail(503, 'cms_session_secret_not_configured');
  }
  if (!config.uploadDir || !isAbsolute(config.uploadDir))
    fail(503, 'cms_upload_dir_not_configured');
  const resolved = resolve(config.uploadDir);
  if (
    !config.allowEphemeralUploadDir &&
    ['/tmp', '/var/tmp', '/dev/shm', '/run'].some(
      (root) => resolved === root || resolved.startsWith(`${root}/`),
    )
  ) {
    fail(503, 'cms_upload_dir_must_be_persistent');
  }
  return { ...config, uploadDir: resolved };
}

async function ensureUploadDirectory(config) {
  await mkdir(config.uploadDir, { recursive: true, mode: 0o700 });
  const actualPath = await realpath(config.uploadDir);
  if (
    !config.allowEphemeralUploadDir &&
    ['/tmp', '/var/tmp', '/dev/shm', '/run'].some(
      (root) => actualPath === root || actualPath.startsWith(`${root}/`),
    )
  ) {
    fail(503, 'cms_upload_dir_must_be_persistent');
  }
  const details = await stat(actualPath);
  if (!details.isDirectory()) fail(503, 'cms_upload_dir_not_a_directory');
  const mode = details.mode & 0o777;
  if ((mode & 0o077) !== 0 || (mode & 0o700) !== 0o700) {
    fail(503, 'cms_upload_dir_permissions_unsafe');
  }
  try {
    await access(actualPath, constants.R_OK | constants.W_OK | constants.X_OK);
  } catch {
    fail(503, 'cms_upload_dir_not_accessible');
  }
  return actualPath;
}

function sameOrigin(req) {
  const origin = req.get('origin');
  const referer = req.get('referer');
  let submitted;
  try {
    submitted = origin ? new URL(origin).origin : referer ? new URL(referer).origin : '';
  } catch {
    return false;
  }
  if (!submitted) return false;
  const expected = `${req.protocol}://${req.get('host')}`;
  try {
    return new URL(expected).origin === submitted;
  } catch {
    return false;
  }
}

function constantTimeEqual(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

function csrfToken() {
  return randomBytes(32).toString('base64url');
}

function saveSession(req) {
  return new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
}

async function ensureCsrfSession(req) {
  if (req.session.csrfToken) return;
  if (
    !req.session.admin?.id &&
    !fixedWindowAllow(
      anonymousSessionAttempts,
      req.ip || 'unknown',
      ANONYMOUS_SESSION_WINDOW_MS,
      ANONYMOUS_SESSION_MAX_ATTEMPTS,
    )
  ) {
    fail(429, 'anonymous_session_rate_limited');
  }
  req.session.csrfToken = csrfToken();
  await saveSession(req);
}

function regenerateSession(req) {
  return new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
}

function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
}

function setAdminHtmlSecurityHeaders(req, res) {
  setSecurityHeaders(req, res, () => {});
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
}

function requireAdmin(req, _res, next) {
  if (!req.session?.admin?.id) return next(new HttpError(401, 'unauthorized'));
  next();
}

function requireMutation(req, _res, next) {
  if (!sameOrigin(req)) return next(new HttpError(403, 'same_origin_required'));
  if (!constantTimeEqual(req.get('x-csrf-token'), req.session?.csrfToken)) {
    return next(new HttpError(403, 'csrf_invalid'));
  }
  next();
}

function contentKind(req) {
  if (!CONTENT_KINDS.has(req.params.kind)) fail(404, 'content_kind_not_found');
  return req.params.kind;
}

function publicSiteOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (configured) {
    let url;
    try {
      url = new URL(configured);
    } catch {
      fail(503, 'public_site_url_invalid');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    ) {
      fail(503, 'public_site_url_invalid');
    }
    return url.origin;
  }
  if (process.env.NODE_ENV === 'production') fail(503, 'public_site_url_not_configured');
  let requestUrl;
  try {
    requestUrl = new URL(`${req.protocol}://${req.get('host')}`);
  } catch {
    fail(503, 'public_site_url_invalid');
  }
  const hostname = requestUrl.hostname.replace(/^\[|\]$/g, '');
  if (
    !['http:', 'https:'].includes(requestUrl.protocol) ||
    requestUrl.username ||
    requestUrl.password ||
    !['localhost', '127.0.0.1', '::1'].includes(hostname)
  ) {
    fail(503, 'public_site_url_not_configured');
  }
  return requestUrl.origin;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function seoRoutes(router, pool) {
  router.get('/robots.txt', (req, res) => {
    const origin = publicSiteOrigin(req);
    res
      .setHeader('Cache-Control', 'public, max-age=3600')
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
      );
  });

  router.get('/sitemap.xml', async (req, res) => {
    const origin = publicSiteOrigin(req);
    const result = await pool.query(
      `SELECT kind, slug, updated_at
       FROM content_entries
       WHERE kind IN ('blog', 'lab')
         AND status = 'published'
         AND (published_at IS NULL OR published_at <= now())
       ORDER BY kind, published_at DESC NULLS LAST, created_at DESC`,
    );
    const paths = [
      '/',
      '/hakkimda',
      '/hizmetler',
      '/blog',
      '/lab',
      '/iletisim',
      ...result.rows.map((entry) => `/${entry.kind}/${encodeURIComponent(entry.slug)}`),
    ];
    const body = paths
      .map((path, index) => {
        const location = xmlEscape(new URL(path, `${origin}/`).toString());
        const updatedAt = index < 6 ? null : new Date(result.rows[index - 6]?.updated_at);
        const lastmod =
          updatedAt && !Number.isNaN(updatedAt.valueOf()) ? updatedAt.toISOString() : '';
        return `<url><loc>${location}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
      })
      .join('');
    res
      .setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
      );
  });
}

function contentQueries(router, pool) {
  router.get('/api/admin/content/:kind', requireAdmin, async (req, res) => {
    const kind = contentKind(req);
    const result = await pool.query(
      'SELECT * FROM content_entries WHERE kind = $1 ORDER BY updated_at DESC, created_at DESC',
      [kind],
    );
    res.json(result.rows.map((row) => safeRecord(row)));
  });

  router.post('/api/admin/content/:kind', requireAdmin, requireMutation, async (req, res) => {
    const kind = contentKind(req);
    const content = normalizeContent(req.body);
    const slug = getSlug(req.body, content);
    const status =
      req.body.status === 'published'
        ? 'published'
        : req.body.status === 'draft' || !req.body.status
          ? 'draft'
          : null;
    if (!status) fail(400, 'invalid_status');
    const publishedAt = parsePublishedAt(req.body.publishedAt, status);
    const id = randomUUID();
    try {
      const result = await pool.query(
        'INSERT INTO content_entries (id, kind, slug, content, status, published_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, kind, slug, content, status, publishedAt],
      );
      res.status(201).json(safeRecord(result.rows[0]));
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'slug_conflict' });
      throw error;
    }
  });

  router.get('/api/admin/content/:kind/:id', requireAdmin, async (req, res) => {
    const kind = contentKind(req);
    const result = await pool.query('SELECT * FROM content_entries WHERE kind = $1 AND id = $2', [
      kind,
      req.params.id,
    ]);
    if (!result.rowCount) fail(404, 'content_not_found');
    res.json(safeRecord(result.rows[0]));
  });

  router.put('/api/admin/content/:kind/:id', requireAdmin, requireMutation, async (req, res) => {
    const kind = contentKind(req);
    const existingResult = await pool.query(
      'SELECT * FROM content_entries WHERE kind = $1 AND id = $2',
      [kind, req.params.id],
    );
    if (!existingResult.rowCount) fail(404, 'content_not_found');
    const existing = safeRecord(existingResult.rows[0]);
    const content = normalizeContent(req.body, existing);
    const slug = getSlug(req.body, content, existing);
    const status = req.body.status === undefined ? existing.status : req.body.status;
    if (status !== 'published' && status !== 'draft') fail(400, 'invalid_status');
    const publishedAt = parsePublishedAt(req.body.publishedAt, status, existingResult.rows[0]);
    try {
      const result = await pool.query(
        'UPDATE content_entries SET slug = $3, content = $4, status = $5, published_at = $6, updated_at = now() WHERE kind = $1 AND id = $2 RETURNING *',
        [kind, req.params.id, slug, content, status, publishedAt],
      );
      res.json(safeRecord(result.rows[0]));
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'slug_conflict' });
      throw error;
    }
  });

  router.delete('/api/admin/content/:kind/:id', requireAdmin, requireMutation, async (req, res) => {
    const kind = contentKind(req);
    const result = await pool.query(
      'DELETE FROM content_entries WHERE kind = $1 AND id = $2 RETURNING id',
      [kind, req.params.id],
    );
    if (!result.rowCount) fail(404, 'content_not_found');
    res.status(204).end();
  });

  router.get('/api/public/content/:kind', async (req, res) => {
    const kind = contentKind(req);
    const result = await pool.query(
      `SELECT * FROM content_entries
       WHERE kind = $1 AND status = 'published' AND (published_at IS NULL OR published_at <= now())
       ORDER BY published_at DESC NULLS LAST, created_at DESC`,
      [kind],
    );
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(result.rows.map((row) => safeRecord(row, { publicView: true })));
  });

  router.get('/api/public/content/:kind/:slug', async (req, res) => {
    const kind = contentKind(req);
    const result = await pool.query(
      `SELECT * FROM content_entries
       WHERE kind = $1 AND slug = $2 AND status = 'published' AND (published_at IS NULL OR published_at <= now())
       LIMIT 1`,
      [kind, req.params.slug],
    );
    if (!result.rowCount) fail(404, 'content_not_found');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(safeRecord(result.rows[0], { publicView: true }));
  });
}

function dashboardRouter(router, pool) {
  router.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    const [counts, recent] = await Promise.all([
      pool.query(`
        SELECT
          count(*) FILTER (WHERE kind = 'blog')::int AS blog_total,
          count(*) FILTER (WHERE kind = 'lab')::int AS lab_total,
          count(*) FILTER (WHERE status = 'published' AND (published_at IS NULL OR published_at <= now()))::int AS published_total,
          count(*) FILTER (WHERE status = 'draft' OR (status = 'published' AND published_at > now()))::int AS draft_total,
          count(*) FILTER (WHERE kind = 'services')::int AS service_total,
          count(*) FILTER (WHERE kind = 'faqs')::int AS faq_total,
          count(*) FILTER (WHERE kind = 'testimonials')::int AS testimonial_total
        FROM content_entries
      `),
      pool.query(
        'SELECT id, name, email, message, read_at, archived_at, created_at FROM contact_messages WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 5',
      ),
    ]);
    const unreadResult = await pool.query(
      'SELECT count(*)::int AS unread_total FROM contact_messages WHERE read_at IS NULL AND archived_at IS NULL',
    );
    res.json({
      blogTotal: counts.rows[0].blog_total,
      labTotal: counts.rows[0].lab_total,
      publishedTotal: counts.rows[0].published_total,
      draftTotal: counts.rows[0].draft_total,
      serviceTotal: counts.rows[0].service_total,
      faqTotal: counts.rows[0].faq_total,
      testimonialTotal: counts.rows[0].testimonial_total,
      unreadMessages: unreadResult.rows[0].unread_total,
      recentMessages: recent.rows,
    });
  });
}

function messageRouter(router, pool) {
  router.get('/api/admin/messages', requireAdmin, async (req, res) => {
    const includeArchived = req.query.archived === 'true';
    const result = await pool.query(
      `SELECT id, name, email, message, read_at, archived_at, created_at
       FROM contact_messages
       WHERE ($1::boolean OR archived_at IS NULL)
       ORDER BY created_at DESC LIMIT 200`,
      [includeArchived],
    );
    res.json(result.rows);
  });

  router.get('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    const result = await pool.query(
      'SELECT id, name, email, message, read_at, archived_at, created_at FROM contact_messages WHERE id = $1',
      [req.params.id],
    );
    if (!result.rowCount) fail(404, 'message_not_found');
    res.json(result.rows[0]);
  });

  router.patch('/api/admin/messages/:id/read', requireAdmin, requireMutation, async (req, res) => {
    if (typeof req.body.read !== 'boolean') fail(400, 'invalid_read_state');
    const result = await pool.query(
      `UPDATE contact_messages SET read_at = CASE WHEN $2 THEN COALESCE(read_at, now()) ELSE NULL END
       WHERE id = $1 RETURNING id, read_at, archived_at`,
      [req.params.id, req.body.read],
    );
    if (!result.rowCount) fail(404, 'message_not_found');
    res.json(result.rows[0]);
  });

  router.patch(
    '/api/admin/messages/:id/archive',
    requireAdmin,
    requireMutation,
    async (req, res) => {
      if (typeof req.body.archived !== 'boolean') fail(400, 'invalid_archive_state');
      const result = await pool.query(
        `UPDATE contact_messages SET archived_at = CASE WHEN $2 THEN COALESCE(archived_at, now()) ELSE NULL END
       WHERE id = $1 RETURNING id, read_at, archived_at`,
        [req.params.id, req.body.archived],
      );
      if (!result.rowCount) fail(404, 'message_not_found');
      res.json(result.rows[0]);
    },
  );

  router.delete('/api/admin/messages/:id', requireAdmin, requireMutation, async (req, res) => {
    const result = await pool.query('DELETE FROM contact_messages WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (!result.rowCount) fail(404, 'message_not_found');
    res.status(204).end();
  });

  router.post('/api/public/contact', requireMutation, async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!fixedWindowAllow(contactAttempts, ip, CONTACT_WINDOW_MS, CONTACT_MAX_ATTEMPTS)) {
      fail(429, 'contact_rate_limited');
    }
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!name || name.length > 120) fail(400, 'invalid_name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail(400, 'invalid_email');
    if (!message || message.length > 20_000) fail(400, 'invalid_message');
    const result = await pool.query(
      'INSERT INTO contact_messages (id, name, email, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [randomUUID(), name, email, message],
    );
    res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
  });
}

function detectFileType(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'image/jpeg';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

function imageMime(mime) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mime);
}

function fileRouter(router, pool, uploadDir) {
  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  });
  router.post('/api/admin/files/:purpose', requireAdmin, requireMutation, (req, res, next) => {
    const purpose = req.params.purpose;
    if (purpose !== 'image' && purpose !== 'cv')
      return next(new HttpError(404, 'file_purpose_not_found'));
    const maximum = purpose === 'cv' ? MAX_CV_BYTES : MAX_IMAGE_BYTES;
    const uploader = multer({
      storage,
      limits: { fileSize: maximum, files: 1 },
      fileFilter: (_request, file, callback) => {
        const mimeAccepted =
          purpose === 'cv' ? file.mimetype === 'application/pdf' : imageMime(file.mimetype);
        callback(mimeAccepted ? null : new HttpError(415, 'unsupported_file_type'), mimeAccepted);
      },
    }).single('file');
    uploader(req, res, async (error) => {
      if (error) return next(error);
      if (!req.file) return next(new HttpError(400, 'file_required'));
      try {
        const bytes = await readFile(req.file.path);
        const mediaType = detectFileType(bytes);
        const accepted = purpose === 'cv' ? mediaType === 'application/pdf' : imageMime(mediaType);
        if (
          !accepted ||
          (req.file.mimetype !== mediaType &&
            !(req.file.mimetype === 'application/octet-stream' && accepted))
        ) {
          await unlink(req.file.path).catch(() => {});
          return next(new HttpError(415, 'file_content_type_mismatch'));
        }
        const fileId = randomUUID();
        const originalName =
          String(req.file.originalname || 'upload')
            .replace(/[\r\n\0]/g, '')
            .slice(0, 180) || 'upload';
        const client = await pool.connect();
        let previousCvId = null;
        try {
          await client.query('BEGIN');
          await client.query(
            'INSERT INTO stored_files (id, storage_key, original_name, media_type, size_bytes, purpose) VALUES ($1, $2, $3, $4, $5, $6)',
            [fileId, req.file.filename, originalName, mediaType, bytes.length, purpose],
          );
          if (purpose === 'cv') {
            const old = await client.query(
              "SELECT value->>'fileId' AS id FROM site_settings WHERE key = 'cv_file'",
            );
            previousCvId = old.rows[0]?.id ?? null;
            await client.query(
              `INSERT INTO site_settings (key, value) VALUES ('cv_file', $1::jsonb)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
              [JSON.stringify({ fileId })],
            );
          }
          await client.query('COMMIT');
        } catch (dbError) {
          await client.query('ROLLBACK');
          await unlink(req.file.path).catch(() => {});
          throw dbError;
        } finally {
          client.release();
        }
        if (previousCvId && previousCvId !== fileId)
          await deleteFileIfUnreferenced(pool, uploadDir, previousCvId);
        res.status(201).json({
          id: fileId,
          purpose,
          mediaType,
          sizeBytes: bytes.length,
          url: `/api/public/files/${fileId}`,
        });
      } catch (caught) {
        next(caught);
      }
    });
  });

  router.get('/api/admin/files', requireAdmin, async (_req, res) => {
    const result = await pool.query(
      'SELECT id, original_name, media_type, size_bytes, purpose, created_at FROM stored_files ORDER BY created_at DESC LIMIT 200',
    );
    res.json(result.rows);
  });

  router.get('/api/admin/files/:id', requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT * FROM stored_files WHERE id = $1', [req.params.id]);
    if (!result.rowCount) fail(404, 'file_not_found');
    sendFile(res, result.rows[0], uploadDir, false);
  });

  router.get('/api/public/site/cv', async (_req, res) => {
    const result = await pool.query(
      "SELECT value->>'fileId' AS id FROM site_settings WHERE key = 'cv_file'",
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ url: result.rows[0]?.id ? `/api/public/files/${result.rows[0].id}` : null });
  });

  router.get('/api/public/files/:id', async (req, res) => {
    const result = await pool.query(
      `SELECT f.* FROM stored_files f
       WHERE f.id = $1 AND (
         (f.purpose = 'cv' AND EXISTS (
           SELECT 1 FROM site_settings s WHERE s.key = 'cv_file' AND s.value->>'fileId' = f.id::text
         )) OR
         (f.purpose = 'image' AND EXISTS (
           SELECT 1 FROM content_entries c
           WHERE c.status = 'published' AND (c.published_at IS NULL OR c.published_at <= now())
             AND c.content->>'coverFileId' = f.id::text
         ))
       )`,
      [req.params.id],
    );
    if (!result.rowCount) fail(404, 'file_not_found');
    sendFile(res, result.rows[0], uploadDir, true);
  });

  router.delete('/api/admin/files/:id', requireAdmin, requireMutation, async (req, res) => {
    const result = await pool.query('SELECT * FROM stored_files WHERE id = $1', [req.params.id]);
    if (!result.rowCount) fail(404, 'file_not_found');
    const file = result.rows[0];
    const references = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM content_entries WHERE content->>'coverFileId' = $1) AS used_by_content,
         EXISTS (SELECT 1 FROM site_settings WHERE key = 'cv_file' AND value->>'fileId' = $1) AS current_cv`,
      [file.id],
    );
    if (references.rows[0].used_by_content) fail(409, 'file_in_use');
    if (references.rows[0].current_cv) {
      await pool.query("DELETE FROM site_settings WHERE key = 'cv_file'");
    }
    await pool.query('DELETE FROM stored_files WHERE id = $1', [file.id]);
    await unlink(join(uploadDir, file.storage_key)).catch(() => {});
    res.status(204).end();
  });
}

async function deleteFileIfUnreferenced(pool, uploadDir, fileId) {
  if (!fileId) return;
  const references = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM content_entries WHERE content->>'coverFileId' = $1) AS used_by_content,
       EXISTS (SELECT 1 FROM site_settings WHERE key = 'cv_file' AND value->>'fileId' = $1) AS current_cv`,
    [fileId],
  );
  if (references.rows[0].used_by_content || references.rows[0].current_cv) return;
  const result = await pool.query('DELETE FROM stored_files WHERE id = $1 RETURNING storage_key', [
    fileId,
  ]);
  if (result.rowCount) await unlink(join(uploadDir, result.rows[0].storage_key)).catch(() => {});
}

function sendFile(res, file, uploadDir, isPublic) {
  const path = join(uploadDir, file.storage_key);
  res.status(200);
  res.setHeader('Content-Type', file.media_type);
  res.setHeader('Content-Length', String(file.size_bytes));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `${file.media_type === 'application/pdf' ? 'attachment' : 'inline'}; filename="${file.id}"`,
  );
  res.setHeader('Cache-Control', isPublic ? 'public, max-age=3600' : 'private, no-store');
  createReadStream(path)
    .on('error', () => {
      if (!res.headersSent) res.status(404).end();
    })
    .pipe(res);
}

function authRouter(router, pool, production) {
  router.get('/api/auth/csrf', async (req, res) => {
    await ensureCsrfSession(req);
    res.json({ csrfToken: req.session.csrfToken });
  });

  router.get('/api/auth/session', async (req, res) => {
    await ensureCsrfSession(req);
    if (!req.session.admin?.id)
      return res.json({ authenticated: false, csrfToken: req.session.csrfToken });
    res.json({
      authenticated: true,
      email: req.session.admin.email,
      csrfToken: req.session.csrfToken,
    });
  });

  router.post('/api/auth/login', requireMutation, async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!fixedWindowAllow(loginAttempts, ip, LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS)) {
      fail(429, 'login_rate_limited');
    }
    const admin = await authenticateAdmin(pool, req.body?.email, req.body?.password);
    if (!admin) return res.status(401).json({ error: 'invalid_credentials' });
    await regenerateSession(req);
    req.session.admin = { id: admin.id, email: admin.email };
    req.session.csrfToken = csrfToken();
    await saveSession(req);
    loginAttempts.delete(ip);
    res.json({ authenticated: true, email: admin.email, csrfToken: req.session.csrfToken });
  });

  router.post('/api/auth/logout', requireAdmin, requireMutation, async (req, res) => {
    await new Promise((resolve, reject) =>
      req.session.destroy((error) => (error ? reject(error) : resolve())),
    );
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/',
    });
    res.status(204).end();
  });
}

function createRouter(pool, uploadDir, production) {
  const router = express.Router();
  router.use(setSecurityHeaders);
  router.use(express.json({ limit: MAX_JSON_BYTES, strict: true }));
  seoRoutes(router, pool);
  authRouter(router, pool, production);
  contentQueries(router, pool);
  dashboardRouter(router, pool);
  messageRouter(router, pool);
  fileRouter(router, pool, uploadDir);
  router.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  router.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file_too_large' });
    }
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    if (error instanceof SyntaxError && 'body' in error)
      return res.status(400).json({ error: 'invalid_json' });
    res.status(500).json({ error: 'internal_error' });
  });
  return router;
}

function createSessionMiddleware(pool, sessionSecret, production, trustProxy) {
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: 'cms_sessions',
    createTableIfMissing: false,
    pruneSessionInterval: 15 * 60,
  });
  return session({
    name: COOKIE_NAME,
    secret: sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: trustProxy,
    cookie: {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    },
  });
}

async function createRuntime(options = {}) {
  const config = validateRuntimeConfig({
    pool: options.pool,
    databaseUrl: options.databaseUrl ?? process.env.DATABASE_URL,
    sessionSecret: options.sessionSecret ?? process.env.SESSION_SECRET,
    uploadDir: options.uploadDir ?? process.env.UPLOAD_DIR,
    allowEphemeralUploadDir: options.allowEphemeralUploadDir === true,
    production: options.production ?? process.env.NODE_ENV === 'production',
    trustProxy: options.trustProxy ?? process.env.TRUST_PROXY === '1',
  });
  const uploadDir = await ensureUploadDirectory(config);
  const pool = config.pool ?? new Pool({ connectionString: config.databaseUrl });
  const schema = await pool.query(
    `SELECT to_regclass('public.admin_users') AS admins,
            to_regclass('public.cms_sessions') AS sessions,
            to_regclass('public.content_entries') AS content`,
  );
  if (!schema.rows[0].admins || !schema.rows[0].sessions || !schema.rows[0].content) {
    if (!config.pool) await pool.end();
    fail(503, 'database_migrations_required');
  }
  const router = createRouter(pool, uploadDir, config.production);
  const sessions = createSessionMiddleware(
    pool,
    config.sessionSecret,
    config.production,
    config.trustProxy,
  );
  return { pool, router, sessions, uploadDir, ownsPool: !config.pool };
}

export function createCmsMiddleware(options = {}) {
  let runtimePromise;
  let runtime;
  const initialize = async () => {
    if (runtime) return runtime;
    runtimePromise ??= createRuntime(options).then((result) => {
      runtime = result;
      return result;
    });
    return runtimePromise;
  };

  const middleware = async (req, res, next) => {
    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    const isAdmin = req.path === '/admin' || req.path.startsWith('/admin/');
    const isSeo = req.path === '/robots.txt' || req.path === '/sitemap.xml';
    if (!isApi && !isAdmin && !isSeo) return next();
    if (isAdmin) setAdminHtmlSecurityHeaders(req, res);
    try {
      const active = await initialize();
      if (isSeo) return active.router(req, res, next);
      active.sessions(req, res, (sessionError) => {
        if (sessionError) return next(sessionError);
        if (isApi) return active.router(req, res, next);
        const loginPage = req.path === '/admin/login';
        if (!loginPage && !req.session?.admin?.id) return res.redirect(302, '/admin/login');
        next();
      });
    } catch {
      if (isApi) return res.status(503).json({ error: 'cms_not_ready' });
      res.status(503).type('text/plain').send('Admin service is not configured.');
    }
  };
  middleware.initialize = initialize;
  middleware.close = async () => {
    if (!runtimePromise) return;
    try {
      const active = await runtimePromise;
      active.sessions.store.close?.();
      if (active.ownsPool) await active.pool.end();
    } catch {
      // Initialization errors are reported at startup by the caller.
    }
  };
  return middleware;
}

export async function createCmsApp(options) {
  const app = express();
  app.disable('x-powered-by');
  if (options?.trustProxy) app.set('trust proxy', 1);
  const cms = createCmsMiddleware(options);
  await cms.initialize();
  app.use(cms);
  return { app, close: () => cms.close() };
}

export async function assertCmsEnvironment() {
  const cms = createCmsMiddleware();
  try {
    await cms.initialize();
  } catch {
    throw new Error('CMS runtime configuration or database migrations are missing.');
  } finally {
    await cms.close();
  }
}

export { CONTENT_KINDS, slugify };
