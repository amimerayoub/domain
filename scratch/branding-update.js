/**
 * branding-update.js
 * Global branding update: logo, favicon, OG image, SEO meta, DM Serif font
 * Run from project root: node scratch/branding-update.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ─── Target HTML files (relative to ROOT) ────────────────────────────────────
const HTML_FILES = [
  'index.html',
  'landing.html',
  'about.html',
  'blog.html',
  'blog-dashboard.html',
  'article.html',
  'contact.html',
  'domain.html',
  'privacy.html',
  'security.html',
  'terms.html',
  // Tool pages (all compiled static pages)
  'geo-domains.html',
  'keyword-domains.html',
  'pattern-domains.html',
  'brandable-domains.html',
  'numeric-domains.html',
  'domain-suggestor.html',
  'wordlist-combiner.html',
  'smart-analyzer.html',
  'smart-email.html',
  'bulk-checker.html',
  'domain-extractor.html',
  'domain-news.html',
  'email-extractor.html',
  'text-tools.html',
  // Blog sub-pages
  'blog/best-ai-domain-names/index.html',
  'blog/find-expired-domains/index.html',
  'blog/how-to-start-domain-flipping/index.html',
  'blog/category/ai-domains/index.html',
  'blog/category/domain-flipping/index.html',
  'blog/category/expired-domains/index.html',
];

// ─── Favicon block to inject (replaces any existing favicon links) ────────────
const FAVICON_BLOCK = `  <link rel="icon" href="/assets/logo/favicon.png" type="image/png">
  <link rel="shortcut icon" href="/assets/logo/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/logo/favicon.png">`;

// ─── OG/Twitter meta block ────────────────────────────────────────────────────
const SEO_TITLE = 'AI Domains - Generate, Analyze & Discover Premium Domain Names';
const SEO_DESC  = 'AI-powered domain generator featuring Geo Domains, Keyword Domains, Pattern Domains, Brandable Names, Smart Analyzer, Smart Email Outreach, Domain Research Tools and Premium Domain Discovery.';
const OG_IMAGE  = '/assets/graph/image1.png';

// ─── Logo IMG element (replaces inline SVG logos in sidebar & headers) ────────
// For the app sidebar (dark background):
const SIDEBAR_LOGO_HTML = `<a href="/" class="logo logo-link" title="Go to Homepage" aria-label="AI Domains Homepage">
        <img src="/assets/logo/logo.png" alt="AI Domains" class="logo-img" style="height:32px;width:auto;display:block;">
        <span class="logo-text">AI Domains</span>
      </a>`;

// For landing/about/blog page headers (light/glassmorphic background):
const HEADER_LOGO_LANDING = `<a href="/" class="flex items-center gap-2.5 group cursor-pointer shrink-0" aria-label="AI Domains Homepage">
                    <img src="/assets/logo/logo.png" alt="AI Domains" style="height:36px;width:auto;display:block;" loading="eager">
                </a>`;

// ─── Font include (DM Serif) ──────────────────────────────────────────────────
const DM_SERIF_FONT = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">`;

// ─── Process each file ────────────────────────────────────────────────────────
let totalChanged = 0;

for (const relPath of HTML_FILES) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ SKIP (not found): ${relPath}`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  // ── 1. Replace ALL favicon link tags ────────────────────────────────────────
  // Remove all existing favicon/apple-touch-icon/manifest link tags
  html = html.replace(/<link[^>]+rel="apple-touch-icon"[^>]*>/gi, '');
  html = html.replace(/<link[^>]+rel="icon"[^>]*>/gi, '');
  html = html.replace(/<link[^>]+rel="shortcut icon"[^>]*>/gi, '');
  html = html.replace(/<link[^>]+rel="manifest"[^>]*>/gi, '');
  // Also strip sizes variants like sizes="32x32" etc – already removed above

  // Inject new favicon block right after <head> opening
  if (!html.includes('/assets/logo/favicon.png')) {
    html = html.replace(/(<head[^>]*>)/i, `$1\n${FAVICON_BLOCK}`);
  }

  // ── 2. Update/add OG & Twitter meta tags ────────────────────────────────────
  // Title
  html = html.replace(/<meta\s+property="og:title"[^>]*>/gi,
    `<meta property="og:title" content="${SEO_TITLE}">`);
  html = html.replace(/<meta\s+property="twitter:title"[^>]*>/gi,
    `<meta property="twitter:title" content="${SEO_TITLE}">`);

  // Description
  html = html.replace(/<meta\s+property="og:description"[^>]*>/gi,
    `<meta property="og:description" content="${SEO_DESC}">`);
  html = html.replace(/<meta\s+property="twitter:description"[^>]*>/gi,
    `<meta property="twitter:description" content="${SEO_DESC}">`);

  // OG Image – replace existing OR inject after og:url
  if (html.includes('og:image')) {
    html = html.replace(/<meta\s+property="og:image"[^>]*>/gi,
      `<meta property="og:image" content="${OG_IMAGE}">`);
  } else {
    // Inject after og:description or og:title
    html = html.replace(
      /(<meta\s+property="og:description"[^>]*>)/i,
      `$1\n  <meta property="og:image" content="${OG_IMAGE}">`
    );
  }

  // Twitter Image
  if (html.includes('twitter:image')) {
    html = html.replace(/<meta\s+property="twitter:image"[^>]*>/gi,
      `<meta property="twitter:image" content="${OG_IMAGE}">`);
    html = html.replace(/<meta\s+name="twitter:image"[^>]*>/gi,
      `<meta name="twitter:image" content="${OG_IMAGE}">`);
  } else {
    html = html.replace(
      /(<meta\s+property="og:image"[^>]*>)/i,
      `$1\n  <meta property="twitter:image" content="${OG_IMAGE}">\n  <meta property="twitter:card" content="summary_large_image">`
    );
  }

  // Twitter card
  if (!html.includes('twitter:card')) {
    html = html.replace(
      /(<meta\s+property="og:image"[^>]*>)/i,
      `$1\n  <meta property="twitter:card" content="summary_large_image">`
    );
  }

  // ── 3. Ensure DM Serif font is loaded ───────────────────────────────────────
  if (!html.includes('DM+Serif+Display') && !html.includes('DM Serif Display')) {
    // Inject before </head>
    html = html.replace(/(<\/head>)/i, `${DM_SERIF_FONT}\n$1`);
  }

  // ── 4. Update main SEO title for index.html specifically ────────────────────
  if (relPath === 'index.html') {
    html = html.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${SEO_TITLE}</title>`
    );
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*">/i,
      `<meta name="description" content="${SEO_DESC}">`
    );
  }

  // ── 5A. Replace sidebar logo (used in index.html / tool pages) ──────────────
  // Pattern: <a href="/" class="logo logo-link"...>...<svg ...>...</svg><span class="logo-text">...</span></a>
  html = html.replace(
    /<a[^>]*class="[^"]*logo[^>]*logo-link[^"]*"[^>]*>[\s\S]*?<\/a>/,
    SIDEBAR_LOGO_HTML
  );

  // ── 5B. Replace landing/about page header logos ──────────────────────────────
  // Pattern in landing.html/about.html: <a href="/" class="flex items-center gap-2 group...">
  //   <div class="w-8 h-8..."><i data-lucide="infinity"...></i></div>
  //   <span class="font-bold...">AI Domain<span class="text-cyan-500">s</span></span>
  // </a>
  // Match this block and replace with logo img
  html = html.replace(
    /<a[^>]*href="[/]?"[^>]*class="[^"]*flex items-center[^"]*"[^>]*>[\s\S]*?<div[^>]*w-8 h-8[^>]*>[\s\S]*?<\/div>\s*<span[^>]*font-bold[^>]*>[\s\S]*?<\/span>\s*<\/a>/g,
    HEADER_LOGO_LANDING
  );

  // ── 5C. Replace footer logo (infinity icon + text pattern) ──────────────────
  // Pattern: <div class="flex items-center gap-2"><i data-lucide="infinity"...></i><span...>AI Domain<span...>s</span></span>...
  html = html.replace(
    /<div[^>]*class="[^"]*flex items-center gap-2[^"]*"[^>]*>\s*<i[^>]*data-lucide="infinity"[^>]*>\s*<\/i>\s*<span[^>]*font-bold[^>]*>AI Domain<span[^>]*text-cyan[^>]*>s<\/span><\/span>/g,
    `<div class="flex items-center gap-2">
                    <img src="/assets/logo/logo.png" alt="AI Domains" style="height:28px;width:auto;display:block;">`
  );

  // ── 6. Update site.webmanifest OG references ─────────────────────────────────
  // (handled separately below for the JSON file)

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    totalChanged++;
    console.log(`✓ Updated: ${relPath}`);
  } else {
    console.log(`– No change: ${relPath}`);
  }
}

// ─── Update site.webmanifest ──────────────────────────────────────────────────
const manifestPath = path.join(ROOT, 'site.webmanifest');
if (fs.existsSync(manifestPath)) {
  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = 'AI Domains';
  manifest.short_name = 'AI Domains';
  manifest.icons = [
    { src: '/assets/logo/favicon.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/logo/favicon.png', sizes: '512x512', type: 'image/png' },
  ];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✓ Updated: site.webmanifest');
  totalChanged++;
}

// ─── Also update build.js to bake new meta into static pages ─────────────────
const buildPath = path.join(ROOT, 'scripts', 'build.js');
if (fs.existsSync(buildPath)) {
  let buildSrc = fs.readFileSync(buildPath, 'utf8');
  const orig = buildSrc;

  // Replace favicon refs in build.js template strings
  buildSrc = buildSrc.replace(/href="favicon-32x32\.png"/g, 'href="/assets/logo/favicon.png"');
  buildSrc = buildSrc.replace(/href="favicon-16x16\.png"/g, 'href="/assets/logo/favicon.png"');
  buildSrc = buildSrc.replace(/href="favicon\.ico"/g, 'href="/assets/logo/favicon.png"');
  buildSrc = buildSrc.replace(/href="apple-touch-icon\.png"/g, 'href="/assets/logo/favicon.png"');

  // Replace logo-svg block in build.js
  buildSrc = buildSrc.replace(
    /<svg viewBox="0 0 36 36"[^>]*class="logo-svg"[^>]*>[\s\S]*?<\/svg>/g,
    `<img src="/assets/logo/logo.png" alt="AI Domains" class="logo-img" style="height:32px;width:auto;display:block;">`
  );

  // Replace og:image in build.js
  buildSrc = buildSrc.replace(
    /<meta property="og:image" content="[^"]*">/g,
    `<meta property="og:image" content="/assets/graph/image1.png">`
  );

  if (buildSrc !== orig) {
    fs.writeFileSync(buildPath, buildSrc, 'utf8');
    console.log('✓ Updated: scripts/build.js');
    totalChanged++;
  }
}

console.log(`\n✅ Done. ${totalChanged} files updated.`);
