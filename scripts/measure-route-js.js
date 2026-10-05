/**
 * Measure the real client JS payload per route from a Next.js production
 * build. Reads `page_client-reference-manifest.js` for every route and sums
 * the raw + gzipped size of the chunks that page actually loads.
 *
 * Usage: node scripts/measure-route-js.js [--top N]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NEXT_DIR = path.join(process.cwd(), '.next');
const APP_DIR = path.join(NEXT_DIR, 'server', 'app');
const CHUNKS_DIR = path.join(NEXT_DIR, 'static', 'chunks');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === 'page_client-reference-manifest.js') out.push(p);
  }
  return out;
}

// Root chunks every page loads (build-manifest rootMainFiles).
const buildManifest = JSON.parse(
  fs.readFileSync(path.join(NEXT_DIR, 'build-manifest.json'), 'utf8')
);
const rootChunks = buildManifest.rootMainFiles;

const sizeCache = new Map();
function chunkStats(rel) {
  // rel looks like "/_next/static/chunks/x.js" or "static/chunks/x.js"
  const rel2 = rel.replace(/^\/_next\//, '');
  if (sizeCache.has(rel2)) return sizeCache.get(rel2);
  const file = path.join(NEXT_DIR, rel2);
  if (!fs.existsSync(file)) return { raw: 0, gz: 0 };
  const buf = fs.readFileSync(file);
  const stats = { raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length };
  sizeCache.set(rel2, stats);
  return stats;
}

function routeName(manifestPath) {
  const rel = path.relative(APP_DIR, manifestPath).split(path.sep).join('/');
  return rel.replace(/page_client-reference-manifest\.js$/, '').replace(/\/$/, '') || '/';
}

const rows = [];
for (const manifestPath of walk(APP_DIR)) {
  const src = fs.readFileSync(manifestPath, 'utf8');
  const chunks = new Set(rootChunks);
  const re = /\/_next\/static\/chunks\/[^"]+/g;
  let m;
  while ((m = re.exec(src))) chunks.add(m[0]);
  let raw = 0;
  let gz = 0;
  for (const c of chunks) {
    const s = chunkStats(c);
    raw += s.raw;
    gz += s.gz;
  }
  rows.push({ route: routeName(manifestPath), files: chunks.size, raw, gz });
}

rows.sort((a, b) => b.gz - a.gz);
const argIdx = process.argv.indexOf('--top');
const top = argIdx > -1 ? Number(process.argv[argIdx + 1]) : 20;

console.log('route'.padEnd(42) + 'files'.padStart(6) + 'raw KB'.padStart(10) + 'gzip KB'.padStart(10));
console.log('-'.repeat(68));
for (const r of rows.slice(0, top)) {
  console.log(
    r.route.padEnd(42) +
      String(r.files).padStart(6) +
      (r.raw / 1024).toFixed(1).padStart(10) +
      (r.gz / 1024).toFixed(1).padStart(10)
  );
}
const totalRoutes = rows.length;
console.log(`\n(${totalRoutes} routes with client components)`);
const home = rows.find((r) => r.route === '/page' || r.route === '/');
if (home) {
  console.log(
    `\nHome route JS: ${(home.raw / 1024).toFixed(1)} KB raw / ${(home.gz / 1024).toFixed(1)} KB gzip across ${home.files} files`
  );
}