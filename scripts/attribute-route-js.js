/**
 * Attribute the client JS payload of a route to the libraries inside each
 * chunk, so we can see WHAT makes a page heavy rather than just how heavy.
 *
 * Usage: node scripts/attribute-route-js.js /tests/page
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NEXT_DIR = path.join(process.cwd(), '.next');
const APP_DIR = path.join(NEXT_DIR, 'server', 'app');

// Accept "page", "/page", "/tests/page" or "tests" — normalize to a folder
// under .next/server/app that holds a page_client-reference-manifest.js.
function resolveManifest(input) {
  const cleaned = input.replace(/^page$/, '').replace(/^\//, '').replace(/\/$/, '');
  const candidates = [
    path.join(APP_DIR, cleaned, 'page_client-reference-manifest.js'),
    path.join(APP_DIR, cleaned + '_client-reference-manifest.js'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const manifest = resolveManifest(process.argv[2] || 'page');
if (!manifest) {
  console.error('No client-reference manifest found for:', process.argv[2]);
  process.exit(1);
}

const buildManifest = JSON.parse(
  fs.readFileSync(path.join(NEXT_DIR, 'build-manifest.json'), 'utf8')
);

const chunks = new Set(buildManifest.rootMainFiles.map((f) => '/_next/' + f));
const src = fs.readFileSync(manifest, 'utf8');
const re = /\/_next\/static\/chunks\/[^"]+/g;
let m;
while ((m = re.exec(src))) chunks.add(m[0]);

const SIGNATURES = [
  ['recharts', /recharts|d3-|victory-vendor|\bShape\b/],
  ['swiper', /swiper|Swiper/],
  ['posthog-js', /posthog/i],
  ['sentry', /sentry/i],
  ['next-auth', /next-auth|authjs/i],
  ['dompurify', /DOMPurify|dompurify/],
  ['lucide-react', /lucide/],
  ['@phosphor-icons', /phosphor/],
  ['sonner', /sonner/i],
  ['react-dom', /react-dom|scheduler/i],
  ['zod', /zod/i],
  ['drizzle/pg (server leak)', /drizzle|node-postgres|from pg/i],
];

const rows = [];
let total = 0;
let totalGz = 0;
for (const c of [...chunks].sort()) {
  const rel = c.replace(/^\/_next\//, '');
  const file = path.join(NEXT_DIR, rel);
  if (!fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);
  const gz = zlib.gzipSync(buf, { level: 9 }).length;
  const text = buf.toString('utf8');
  const tags = SIGNATURES.filter(([, re]) => re.test(text)).map(([n]) => n);
  rows.push({ file: path.basename(rel), raw: buf.length, gz, tags });
  total += buf.length;
  totalGz += gz;
}

rows.sort((a, b) => b.gz - a.gz);
console.log(`Route manifest: ${path.relative(APP_DIR, manifest)}\n`);
console.log('chunk'.padEnd(28) + 'raw KB'.padStart(9) + 'gzip KB'.padStart(10) + '  matched');
console.log('-'.repeat(78));
for (const r of rows) {
  console.log(
    r.file.padEnd(28) +
      (r.raw / 1024).toFixed(1).padStart(9) +
      (r.gz / 1024).toFixed(1).padStart(10) +
      '  ' + (r.tags.join(', ') || '-')
  );
}
console.log('-'.repeat(78));
console.log(
  'TOTAL'.padEnd(28) + (total / 1024).toFixed(1).padStart(9) + (totalGz / 1024).toFixed(1).padStart(10)
);