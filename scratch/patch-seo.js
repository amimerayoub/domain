/**
 * Patch script: replaces generateClientSeoHtml in main.js
 * and generateSeoHtml in build.js with the new premium design template.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ─── NEW SHARED HTML BUILDER (string, used for both files) ─── */
function buildHtml(isNode) {
  // When building for Node (build.js), we use plain string concat.
  // When writing JS source, we write the template literal directly.
  return `
function FNAME(toolKey, config, EXTRA) {
  const aboutHtml = config.about.map(p => \`<p class="seo-p">\${p}</p>\`).join('');

  const featuresHtml = config.features.map(f => \`
    <li class="seo-feat-item">
      <span class="seo-feat-check" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="seo-feat-label">\${f}</span>
    </li>
  \`).join('');

  const faqsHtml = config.faqs.map((faq, i) => \`
    <details class="seo-faq-item" \${i === 0 ? 'open' : ''}>
      <summary class="seo-faq-trigger">
        <span class="seo-faq-q-text">\${faq.q}</span>
        <span class="seo-faq-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="seo-faq-body">
        <p class="seo-p">\${faq.a}</p>
      </div>
    </details>
  \`).join('');

  const relatedDisplayNames = {
    geo: 'Geo Generator',
    keyword: 'Keyword Generator',
    pattern: 'Pattern Generator',
    brandable: 'Brandable Names',
    numeric: 'Numeric Generator',
    suggestor: 'AI Suggestor',
    wordlist: 'WordList Combiner',
    analyzer: 'Smart Analyzer',
    emailtool: 'Email Outreach',
    bulkcheck: 'Bulk Checker',
    extractor: 'Domain Extractor',
    texttools: 'Text Tools',
    emailextractor: 'Email Extractor',
    newsdomain: 'Domain News'
  };

  const relatedHtml = config.related.map(key => {
    const rConfig = RCONFIG_LOOKUP;
    if (!rConfig) return '';
    return \`<a href="\${rConfig.path}" class="seo-pill">\${relatedDisplayNames[key]}</a>\`;
  }).join('');

  return \`
    <div class="seo-doc-wrap">

      <div class="seo-doc-sep" aria-hidden="true">
        <div class="seo-doc-sep-line"></div>
        <span class="seo-doc-sep-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Documentation
        </span>
        <div class="seo-doc-sep-line"></div>
      </div>

      <article class="seo-doc-card">

        <header class="seo-doc-header">
          <div class="seo-doc-header-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="seo-doc-header-text">
            <h2 class="seo-doc-title">\${config.h1}</h2>
            <p class="seo-doc-subtitle">Tool Guide &amp; Documentation</p>
          </div>
        </header>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">01</span>
            <h3 class="seo-section-heading">About This Tool</h3>
          </div>
          <div class="seo-section-body">
            \${aboutHtml}
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">02</span>
            <h3 class="seo-section-heading">Key Features</h3>
          </div>
          <div class="seo-section-body">
            <ul class="seo-feat-grid">
              \${featuresHtml}
            </ul>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">03</span>
            <h3 class="seo-section-heading">Frequently Asked Questions</h3>
          </div>
          <div class="seo-section-body">
            <div class="seo-faq-stack">
              \${faqsHtml}
            </div>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">04</span>
            <h3 class="seo-section-heading">Related Tools</h3>
          </div>
          <div class="seo-section-body">
            <p class="seo-p seo-related-intro">Explore other tools in the AI Domains platform:</p>
            <div class="seo-pills-wrap">
              \${relatedHtml}
            </div>
          </div>
        </section>

      </article>
    </div>
  \`;
}`.trim();
}

/* ─── PATCH main.js ─── */
{
  const filePath = path.join(ROOT, 'js', 'main.js');
  let src = fs.readFileSync(filePath, 'utf8');

  const startMarker = 'function generateClientSeoHtml(toolKey, config, allConfigs) {';
  const endMarker = '\n}\n';

  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) { console.error('main.js: startMarker not found'); process.exit(1); }

  // Find the closing brace — count depth
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  }
  if (endIdx === -1) { console.error('main.js: closing brace not found'); process.exit(1); }

  const newFn = `function generateClientSeoHtml(toolKey, config, allConfigs) {
  const aboutHtml = config.about.map(p => \`<p class="seo-p">\${p}</p>\`).join('');

  const featuresHtml = config.features.map(f => \`
    <li class="seo-feat-item">
      <span class="seo-feat-check" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="seo-feat-label">\${f}</span>
    </li>
  \`).join('');

  const faqsHtml = config.faqs.map((faq, i) => \`
    <details class="seo-faq-item" \${i === 0 ? 'open' : ''}>
      <summary class="seo-faq-trigger">
        <span class="seo-faq-q-text">\${faq.q}</span>
        <span class="seo-faq-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="seo-faq-body">
        <p class="seo-p">\${faq.a}</p>
      </div>
    </details>
  \`).join('');

  const relatedDisplayNames = {
    geo: 'Geo Generator',
    keyword: 'Keyword Generator',
    pattern: 'Pattern Generator',
    brandable: 'Brandable Names',
    numeric: 'Numeric Generator',
    suggestor: 'AI Suggestor',
    wordlist: 'WordList Combiner',
    analyzer: 'Smart Analyzer',
    emailtool: 'Email Outreach',
    bulkcheck: 'Bulk Checker',
    extractor: 'Domain Extractor',
    texttools: 'Text Tools',
    emailextractor: 'Email Extractor',
    newsdomain: 'Domain News'
  };

  const relatedHtml = config.related.map(key => {
    const rConfig = allConfigs[key];
    if (!rConfig) return '';
    return \`<a href="\${rConfig.path}" class="seo-pill">\${relatedDisplayNames[key]}</a>\`;
  }).join('');

  return \`
    <div class="seo-doc-wrap">

      <div class="seo-doc-sep" aria-hidden="true">
        <div class="seo-doc-sep-line"></div>
        <span class="seo-doc-sep-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Documentation
        </span>
        <div class="seo-doc-sep-line"></div>
      </div>

      <article class="seo-doc-card">

        <header class="seo-doc-header">
          <div class="seo-doc-header-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="seo-doc-header-text">
            <h2 class="seo-doc-title">\${config.h1}</h2>
            <p class="seo-doc-subtitle">Tool Guide &amp; Documentation</p>
          </div>
        </header>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">01</span>
            <h3 class="seo-section-heading">About This Tool</h3>
          </div>
          <div class="seo-section-body">
            \${aboutHtml}
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">02</span>
            <h3 class="seo-section-heading">Key Features</h3>
          </div>
          <div class="seo-section-body">
            <ul class="seo-feat-grid">
              \${featuresHtml}
            </ul>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">03</span>
            <h3 class="seo-section-heading">Frequently Asked Questions</h3>
          </div>
          <div class="seo-section-body">
            <div class="seo-faq-stack">
              \${faqsHtml}
            </div>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">04</span>
            <h3 class="seo-section-heading">Related Tools</h3>
          </div>
          <div class="seo-section-body">
            <p class="seo-p seo-related-intro">Explore other tools in the AI Domains platform:</p>
            <div class="seo-pills-wrap">
              \${relatedHtml}
            </div>
          </div>
        </section>

      </article>
    </div>
  \`;
}`;

  const patched = src.slice(0, startIdx) + newFn + src.slice(endIdx);
  fs.writeFileSync(filePath, patched, 'utf8');
  console.log('✓ main.js patched');
}

/* ─── PATCH build.js ─── */
{
  const filePath = path.join(ROOT, 'scripts', 'build.js');
  let src = fs.readFileSync(filePath, 'utf8');

  const startMarker = 'function generateSeoHtml(toolKey, config) {';
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) { console.error('build.js: startMarker not found'); process.exit(1); }

  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  }
  if (endIdx === -1) { console.error('build.js: closing brace not found'); process.exit(1); }

  const newFn = `function generateSeoHtml(toolKey, config) {
  const aboutHtml = config.about.map(p => \`<p class="seo-p">\${p}</p>\`).join('');

  const featuresHtml = config.features.map(f => \`
    <li class="seo-feat-item">
      <span class="seo-feat-check" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="seo-feat-label">\${f}</span>
    </li>
  \`).join('');

  const faqsHtml = config.faqs.map((faq, i) => \`
    <details class="seo-faq-item" \${i === 0 ? 'open' : ''}>
      <summary class="seo-faq-trigger">
        <span class="seo-faq-q-text">\${faq.q}</span>
        <span class="seo-faq-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="seo-faq-body">
        <p class="seo-p">\${faq.a}</p>
      </div>
    </details>
  \`).join('');

  const relatedDisplayNames = {
    geo: 'Geo Generator',
    keyword: 'Keyword Generator',
    pattern: 'Pattern Generator',
    brandable: 'Brandable Names',
    numeric: 'Numeric Generator',
    suggestor: 'AI Suggestor',
    wordlist: 'WordList Combiner',
    analyzer: 'Smart Analyzer',
    emailtool: 'Email Outreach',
    bulkcheck: 'Bulk Checker',
    extractor: 'Domain Extractor',
    texttools: 'Text Tools',
    emailextractor: 'Email Extractor',
    newsdomain: 'Domain News'
  };

  const relatedHtml = config.related.map(key => {
    const rConfig = toolConfigs[key];
    if (!rConfig) return '';
    return \`<a href="\${rConfig.path}" class="seo-pill">\${relatedDisplayNames[key]}</a>\`;
  }).join('');

  return \`
    <div class="seo-doc-wrap">

      <div class="seo-doc-sep" aria-hidden="true">
        <div class="seo-doc-sep-line"></div>
        <span class="seo-doc-sep-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Documentation
        </span>
        <div class="seo-doc-sep-line"></div>
      </div>

      <article class="seo-doc-card">

        <header class="seo-doc-header">
          <div class="seo-doc-header-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="seo-doc-header-text">
            <h2 class="seo-doc-title">\${config.h1}</h2>
            <p class="seo-doc-subtitle">Tool Guide &amp; Documentation</p>
          </div>
        </header>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">01</span>
            <h3 class="seo-section-heading">About This Tool</h3>
          </div>
          <div class="seo-section-body">
            \${aboutHtml}
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">02</span>
            <h3 class="seo-section-heading">Key Features</h3>
          </div>
          <div class="seo-section-body">
            <ul class="seo-feat-grid">
              \${featuresHtml}
            </ul>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">03</span>
            <h3 class="seo-section-heading">Frequently Asked Questions</h3>
          </div>
          <div class="seo-section-body">
            <div class="seo-faq-stack">
              \${faqsHtml}
            </div>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">04</span>
            <h3 class="seo-section-heading">Related Tools</h3>
          </div>
          <div class="seo-section-body">
            <p class="seo-p seo-related-intro">Explore other tools in the AI Domains platform:</p>
            <div class="seo-pills-wrap">
              \${relatedHtml}
            </div>
          </div>
        </section>

      </article>
    </div>
  \`;
}`;

  const patched = src.slice(0, startIdx) + newFn + src.slice(endIdx);
  fs.writeFileSync(filePath, patched, 'utf8');
  console.log('✓ build.js patched');
}

console.log('All patches applied successfully.');
