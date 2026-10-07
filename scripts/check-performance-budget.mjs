import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserDirectory = resolve(repositoryRoot, 'dist/mainsite/browser');
const indexPath = join(browserDirectory, 'index.html');
const indexHtml = await readFile(indexPath, 'utf8');

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match?.[1];
}

function safeAssetPath(path) {
  const asset = resolve(browserDirectory, path.replace(/^\//, ''));
  if (asset !== browserDirectory && !asset.startsWith(`${browserDirectory}${sep}`)) {
    throw new Error(`Asset escapes the browser output directory: ${path}`);
  }
  return asset;
}

const scriptAssets = new Set(
  [...indexHtml.matchAll(/<script\b[^>]*>/gi)]
    .map(([tag]) => attribute(tag, 'src'))
    .filter(Boolean),
);
const stylesheets = new Set();
const preloadedModules = new Set();
for (const [tag] of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
  const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
  const href = attribute(tag, 'href');
  if (!href) continue;
  if (rel.includes('stylesheet')) stylesheets.add(href);
  if (rel.includes('modulepreload')) preloadedModules.add(href);
}
for (const asset of preloadedModules) scriptAssets.add(asset);

async function gzipBytes(assets) {
  let total = 0;
  for (const asset of assets) {
    const bytes = await readFile(safeAssetPath(asset));
    total += gzipSync(bytes, { level: 9 }).byteLength;
  }
  return total;
}

const jsBytes = await gzipBytes(scriptAssets);
const cssBytes = await gzipBytes(stylesheets);
const totalBytes = jsBytes + cssBytes;
const budgets = {
  js: Number(process.env.INITIAL_JS_GZIP_BUDGET_KIB ?? 145) * 1024,
  css: Number(process.env.INITIAL_CSS_GZIP_BUDGET_KIB ?? 16) * 1024,
  total: Number(process.env.INITIAL_TRANSFER_GZIP_BUDGET_KIB ?? 160) * 1024,
};
const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
console.log(`Initial JavaScript (gzip): ${format(jsBytes)} / ${format(budgets.js)}`);
console.log(`Initial CSS (gzip):        ${format(cssBytes)} / ${format(budgets.css)}`);
console.log(`Initial total (gzip):      ${format(totalBytes)} / ${format(budgets.total)}`);

const outputStat = await stat(indexPath);
if (!outputStat.isFile()) throw new Error('Production browser index.html is missing.');
const failures = [];
if (jsBytes > budgets.js) failures.push('initial JavaScript gzip budget exceeded');
if (cssBytes > budgets.css) failures.push('initial CSS gzip budget exceeded');
if (totalBytes > budgets.total) failures.push('initial transfer gzip budget exceeded');
if (failures.length) throw new Error(failures.join('; '));
