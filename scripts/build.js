const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const workspaceDir = path.join(__dirname, '..');
const templatePath = path.join(workspaceDir, 'index.html');
const landingPath = path.join(workspaceDir, 'landing.html');
const sitemapPath = path.join(workspaceDir, 'sitemap.xml');

// Tool definitions with SEO metadata, semantic content, and FAQs
const toolConfigs = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'data', 'seo-configs.json'), 'utf8'));

// Generate SEO Content HTML Block to inject
function generateSeoHtml(toolKey, config) {
  const aboutHtml = config.about.map(p => `<p class="seo-paragraph">${p}</p>`).join('');
  const featuresHtml = config.features.map(f => `
    <li class="seo-feature-item">
      <span class="seo-feature-icon">✓</span>
      <span class="seo-feature-text">${f}</span>
    </li>
  `).join('');
  const faqsHtml = config.faqs.map(faq => `
    <details class="seo-faq-accordion">
      <summary class="seo-faq-question">
        <span>${faq.q}</span>
        <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </summary>
      <div class="seo-faq-answer">
        <p class="seo-paragraph">${faq.a}</p>
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
    return `<a href="${rConfig.path}" class="seo-related-link">${relatedDisplayNames[key]}</a>`;
  }).join('');

  return `
    <div class="seo-card">
      <div class="seo-inner">
        <section class="seo-block seo-about-section">
          <h2 class="seo-h2">About ${config.h1}</h2>
          <div class="seo-about-content">
            ${aboutHtml}
          </div>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-features-section">
          <h2 class="seo-h2">Key Tool Features</h2>
          <ul class="seo-feature-list">
            ${featuresHtml}
          </ul>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-faq-section">
          <h2 class="seo-h2">Frequently Asked Questions</h2>
          <div class="seo-faq-list">
            ${faqsHtml}
          </div>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-related-section">
          <h2 class="seo-h2">Related Domain Tools</h2>
          <div class="seo-related-grid">
            ${relatedHtml}
          </div>
        </section>
      </div>
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
    
    // Twitter Card Tags
    if (!$('meta[name="twitter:card"]').length) {
      $('head').append('<meta name="twitter:card" content="summary_large_image">');
    }
    if (!$('meta[name="twitter:title"]').length) {
      $('head').append(`<meta name="twitter:title" content="${config.title}">`);
      $('head').append(`<meta name="twitter:description" content="${config.desc}">`);
    } else {
      $('meta[name="twitter:title"]').attr('content', config.title);
      $('meta[name="twitter:description"]').attr('content', config.desc);
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
