const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const workspaceDir = path.join(__dirname, '..');
const templatePath = path.join(workspaceDir, 'template.html');
const sitemapPath = path.join(workspaceDir, 'sitemap.xml');

// Tool definitions with SEO metadata, semantic content, and FAQs
const toolConfigs = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'data', 'seo-configs.json'), 'utf8'));

// Generate SEO Content HTML Block to inject
function generateSeoHtml(toolKey, config) {
  const aboutHtml = config.about.map(p => `<p class="seo-p">${p}</p>`).join('');

  const featuresHtml = config.features.map(f => `
    <li class="seo-feat-item">
      <span class="seo-feat-check" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="seo-feat-label">${f}</span>
    </li>
  `).join('');

  const howToUseHtml = `<p class="seo-p">${config.desc}</p>`;

  const faqsHtml = config.faqs.map((faq, i) => `
    <details class="seo-faq-item" ${i === 0 ? 'open' : ''}>
      <summary class="seo-faq-trigger">
        <span class="seo-faq-q-text">${faq.q}</span>
        <span class="seo-faq-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="seo-faq-body">
        <p class="seo-p">${faq.a}</p>
      </div>
    </details>
  `).join('');

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
    return `<a href="${rConfig.path}" class="seo-pill">${relatedDisplayNames[key]}</a>`;
  }).join('');

  return `
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
            <h2 class="seo-doc-title">${config.h1}</h2>
            <p class="seo-doc-subtitle">Tool Guide &amp; Documentation</p>
          </div>
        </header>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">01</span>
            <h2 class="seo-section-heading">About This Tool</h2>
          </div>
          <div class="seo-section-body">
            ${aboutHtml}
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">02</span>
            <h2 class="seo-section-heading">Key Features</h2>
          </div>
          <div class="seo-section-body">
            <ul class="seo-feat-grid">
              ${featuresHtml}
            </ul>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">03</span>
            <h2 class="seo-section-heading">How To Use</h2>
          </div>
          <div class="seo-section-body">
            <div class="seo-how-card">
              ${howToUseHtml}
            </div>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">04</span>
            <h2 class="seo-section-heading">Frequently Asked Questions</h2>
          </div>
          <div class="seo-section-body">
            <div class="seo-faq-stack">
              ${faqsHtml}
            </div>
          </div>
        </section>

        <div class="seo-doc-rule"></div>

        <section class="seo-doc-section">
          <div class="seo-section-label">
            <span class="seo-section-num">05</span>
            <h2 class="seo-section-heading">Related Tools</h2>
          </div>
          <div class="seo-section-body">
            <p class="seo-p seo-related-intro">Explore other tools in the AI Domains platform:</p>
            <div class="seo-pills-wrap">
              ${relatedHtml}
            </div>
          </div>
        </section>

      </article>
    </div>
  `;
}

// Generate JSON-LD Schema string
function getJsonLdSchema(toolKey, config) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": config.h1,
    "description": config.desc,
    "url": `https://aidomains.co${config.path}`,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "creator": {
      "@type": "Organization",
      "name": "AI Domains"
    }
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

async function build() {
  console.log('Starting static pages compiler...');
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Master template ${templatePath} not found.`);
    process.exit(1);
  }

  const masterHtml = fs.readFileSync(templatePath, 'utf8');

  // Process and generate each tool HTML file
  for (const [key, config] of Object.entries(toolConfigs)) {
    const $ = cheerio.load(masterHtml);

    // 1. Update <head> metadata
    $('title').text(config.title);
    $('meta[name="description"]').attr('content', config.desc);
    $('link[rel="canonical"]').attr('href', `https://aidomains.co${config.path}`);
    
    // Open Graph Tags
    $('meta[property="og:title"]').attr('content', config.title);
    $('meta[property="og:description"]').attr('content', config.desc);
    $('meta[property="og:url"]').attr('content', `https://aidomains.co${config.path}`);
    // OG Image
    if ($('meta[property="og:image"]').length) {
      $('meta[property="og:image"]').attr('content', '/assets/graph/image1.png');
    } else {
      $('head').append('<meta property="og:image" content="/assets/graph/image1.png">');
    }

    // Twitter Card Tags
    if (!$('meta[name="twitter:card"]').length && !$('meta[property="twitter:card"]').length) {
      $('head').append('<meta property="twitter:card" content="summary_large_image">');
    }
    if (!$('meta[name="twitter:title"]').length && !$('meta[property="twitter:title"]').length) {
      $('head').append(`<meta property="twitter:title" content="${config.title}">`);
      $('head').append(`<meta property="twitter:description" content="${config.desc}">`);
      $('head').append('<meta property="twitter:image" content="/assets/graph/image1.png">');
    } else {
      $('meta[name="twitter:title"], meta[property="twitter:title"]').attr('content', config.title);
      $('meta[name="twitter:description"], meta[property="twitter:description"]').attr('content', config.desc);
      if ($('meta[name="twitter:image"], meta[property="twitter:image"]').length) {
        $('meta[name="twitter:image"], meta[property="twitter:image"]').attr('content', '/assets/graph/image1.png');
      } else {
        $('head').append('<meta property="twitter:image" content="/assets/graph/image1.png">');
      }
    }


    // Append JSON-LD Schema
    $('head').append('\n  ' + getJsonLdSchema(key, config));

    // 2. Set active classes for DOM elements
    // Inactivate default active panel (home-panel)
    $('.tool-panel').removeClass('active');
    
    // Activate specific tool panel
    const targetPanel = $(`#${key}-panel`);
    if (targetPanel.length) {
      targetPanel.addClass('active');
    }

    // Inject only the active SEO tool content block inside #seoContentSection
    const seoContentSection = $('#seoContentSection');
    if (seoContentSection.length) {
      const seoHtml = `
      <div id="seo-content-${key}" class="seo-tool-content active">
        ${generateSeoHtml(key, config)}
      </div>\n`;
      seoContentSection.html(seoHtml);
    }

    // Set sidebar navigation active class
    $('.nav-item').removeClass('active');
    $(`.nav-item[data-tool="${key}"]`).addClass('active');

    // Update navbar header title statically
    const displayTitles = {
      geo: 'Geo Domain Generator', keyword: 'Keyword Domain Generator',
      pattern: 'Pattern Domain Generator', brandable: 'Brandable Name Generator',
      numeric: 'Numeric Domain Generator', suggestor: 'Domain Suggestor',
      wordlist: 'WordList Combiner', analyzer: 'Smart Domain Analyzer',
      emailtool: 'Smart Email Tool', bulkcheck: 'Bulk Domain Checker',
      extractor: 'Domain Extractor', texttools: 'Text Tools',
      emailextractor: 'Email Extractor', newsdomain: 'Gen Domain News'
    };
    $('#navbarTitle').text(displayTitles[key] || 'AI Domain Generator');

    // Write final output html file
    const outputPath = path.join(workspaceDir, config.filename);
    fs.writeFileSync(outputPath, $.html(), 'utf8');
    console.log(`Compiled: ${config.filename} -> ${config.path}`);
  }

  // --- Compile Sitemap.xml ---
  console.log('Generating sitemap.xml...');
  const sitemapUrls = [
    'https://aidomains.co/',
    ...Object.values(toolConfigs).map(c => `https://aidomains.co${c.path}`),
    'https://aidomains.co/about',
    'https://aidomains.co/contact',
    'https://aidomains.co/privacy',
    'https://aidomains.co/terms',
    'https://aidomains.co/security',
    'https://aidomains.co/blog',
    'https://aidomains.co/blog/how-to-start-domain-flipping/',
    'https://aidomains.co/blog/best-ai-domain-names/',
    'https://aidomains.co/blog/find-expired-domains/',
    'https://aidomains.co/blog/category/domain-flipping/',
    'https://aidomains.co/blog/category/ai-domains/',
    'https://aidomains.co/blog/category/expired-domains/'
  ];

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>${url.includes('/blog/') ? 'monthly' : 'weekly'}</changefreq>
    <priority>${url === 'https://aidomains.co/' ? '1.0' : url.includes('/blog') ? '0.7' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
  console.log('Sitemap.xml generated successfully.');

  console.log('Static compiling successfully completed!');
}

build().catch(err => {
  console.error('Build compilation failed:', err);
  process.exit(1);
});
