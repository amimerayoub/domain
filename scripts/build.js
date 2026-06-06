const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const workspaceDir = path.join(__dirname, '..');
const templatePath = path.join(workspaceDir, 'index.html');
const landingPath = path.join(workspaceDir, 'landing.html');
const sitemapPath = path.join(workspaceDir, 'sitemap.xml');

// Tool definitions with SEO metadata, semantic content, and FAQs
const toolConfigs = {
  geo: {
    filename: 'geo-domains.html',
    path: '/geo-domains',
    title: 'Geo Domain Generator | AI Domains',
    desc: 'Generate location-based domains for local businesses and lead generation using city + service combinations.',
    h1: 'Geo Domain Generator',
    intro: 'Instantly find available location-specific domains for local service niches and lead generation sites.',
    features: [
      'Generate location-based domains using actual census populations',
      'Select customized target locations including US Cities, UK Cities, and Canada Cities',
      'Filter and sort results by population, CPC potential, or shortest character length',
      'Check WHOIS registration availability in real-time'
    ],
    faqs: [
      { q: 'What is a geo domain?', a: 'A geo domain is a domain name that combines a city or location with a service keyword, such as BostonPlumber.com or MiamiRoofing.com.' },
      { q: 'Why are geo domains valuable for SEO?', a: 'Geo domains target highly localized search intent. Search engines recognize the semantic relevance of the location + service, helping websites rank faster in local map and search results.' },
      { q: 'Can I use custom locations?', a: 'Yes! The tool allows you to input custom city or state names alongside the pre-loaded databases.' }
    ]
  },
  keyword: {
    filename: 'keyword-domains.html',
    path: '/keyword-domains',
    title: 'Keyword Domain Generator | AI Domains',
    desc: 'Generate niche-specific domains from seed keywords with premium prefix and suffix combinations.',
    h1: 'Keyword Domain Generator',
    intro: 'Find search-friendly domain names by blending your target seed keywords with premium prefix and suffix naming lists.',
    features: [
      'Blend seed keywords with hand-curated premium suffixes and prefixes',
      'Target specific business niches like Tech, Finance, Health, and Real Estate',
      'Perform real-time bulk check availability',
      'Keep search results stored locally in your active favorites list'
    ],
    faqs: [
      { q: 'How do keyword domains help branding?', a: 'Keyword domains contain terms that describe what your company does, making it instantly clear to customers and search engines.' },
      { q: 'Are prefix/suffix domains expensive to register?', a: 'No, prefix/suffix domains are typically standard-rate hand registrations, costing as little as $10-$15.' }
    ]
  },
  pattern: {
    filename: 'pattern-domains.html',
    path: '/pattern-domains',
    title: 'Pattern Domain Generator | AI Domains',
    desc: 'Create short, highly brandable domains using custom CVC, CVVC, or CVCC pattern combinations.',
    h1: 'Pattern Domain Generator',
    intro: 'Generate structured brandable domains optimized for startups using custom consonant and vowel formulas.',
    features: [
      'Generate domains using structured formulas like CVC, CVVC, CVCV, and more',
      'Apply custom letter constraints (include or exclude specific vowels or consonants)',
      'Find premium short pronounceable names',
      'Bulk export results directly to CSV or JSON formats'
    ],
    faqs: [
      { q: 'What does CVC mean in domaining?', a: 'CVC stands for Consonant-Vowel-Consonant. These represent highly brandable, short letter combinations that are easy to remember.' },
      { q: 'Why are short pattern domains highly valued?', a: 'Short domains are scarce. Startups prize pronounceable, short names for branding, and investors flip them for high margins.' }
    ]
  },
  brandable: {
    filename: 'brandable-domains.html',
    path: '/brandable-domains',
    title: 'Brandable Name Generator | AI Domains',
    desc: 'Create memorable startup names optimized for brand protection and domain flipping.',
    h1: 'Brandable Name Generator',
    intro: 'Generate abstract, catchy startup-style names with clean brand potential and instant trademark suitability.',
    features: [
      'Generate abstract names based on semantic associations',
      'Filter names by character length and syllable count',
      'Instantly check .com and popular tech TLD availability',
      'Perfect for product launches and new startup ventures'
    ],
    faqs: [
      { q: 'What is a brandable domain name?', a: 'A brandable domain is a made-up or abstract word (like Google, Shopify, or Zoom) that doesn\'t directly describe a service but creates a distinct brand identity.' },
      { q: 'How do I choose between a keyword and a brandable domain?', a: 'Keyword domains are great for instant SEO signals and local services. Brandable domains are ideal for scaling startups and building unique intellectual property.' }
    ]
  },
  numeric: {
    filename: 'numeric-domains.html',
    path: '/numeric-domains',
    title: 'Numeric Domain Generator | AI Domains',
    desc: 'Generate premium numeric domain names (NNN, NNNN, NNNNN) for liquid digital assets.',
    h1: 'Numeric Domain Generator',
    intro: 'Discover available number-based domains in popular formats including NNN, NNNN, and NNNNN.',
    features: [
      'Generate structured numeric domains using specific formats',
      'Exclude historically unpopular numbers like 0 or 4',
      'Find liquid digital assets popular in global markets',
      'Export and check availability in bulk'
    ],
    faqs: [
      { q: 'Why are numeric domains valuable?', a: 'Numbers are universal and carry no language barriers. Short numeric domains (like 3-digit and 4-digit .com names) are highly liquid and act as premium stores of value.' },
      { q: 'What do NNNN and NNNNN mean?', a: 'N stands for Number. NNNN represents a 4-digit domain (e.g., 8888.com), and NNNNN represents a 5-digit domain.' }
    ]
  },
  suggestor: {
    filename: 'domain-suggestor.html',
    path: '/domain-suggestor',
    title: 'AI Domain Suggestor | AI Domains',
    desc: 'Get smart, AI-powered domain name suggestions based on your business description or keywords.',
    h1: 'Domain Suggestor',
    intro: 'Describe your business or project idea and let our AI suggest creative, available domain names.',
    features: [
      'Uses advanced semantic search technology to recommend contextual domains',
      'Input plain English descriptions of your product or idea',
      'Filters suggestions by category, extensions, and character length',
      'Checks domain registration availability on the fly'
    ],
    faqs: [
      { q: 'How does the domain suggestor use AI?', a: 'It analyzes the semantic meaning of your business description to generate names that are contextually relevant, rather than just doing simple keyword combinations.' }
    ]
  },
  wordlist: {
    filename: 'wordlist-combiner.html',
    path: '/wordlist-combiner',
    title: 'WordList Combiner | AI Domains',
    desc: 'Combine custom prefix and suffix word lists to generate bulk domain name combinations.',
    h1: 'WordList Combiner',
    intro: 'Combine two custom lists of words to create massive sets of domain name variations instantly.',
    features: [
      'Paste or upload your own prefix and suffix lists',
      'Combine thousands of combinations with a single click',
      'Instantly check availability for the entire combined set',
      'Filter output by TLD and character length'
    ],
    faqs: [
      { q: 'How many combinations can I check?', a: 'You can check up to thousands of combinations. Results are batched and checked asynchronously to ensure fast load times.' }
    ]
  },
  analyzer: {
    filename: 'smart-analyzer.html',
    path: '/smart-analyzer',
    title: 'Smart Domain Analyzer | AI Domains',
    desc: 'Analyze domain SEO metrics, age, backlinks, and flip potential instantly.',
    h1: 'Smart Domain Analyzer',
    intro: 'Input any domain list to evaluate domain authority, backlink metrics, CPC keywords, and overall investment quality.',
    features: [
      'Calculate an instant AI-powered Domain Score (0-100)',
      'Analyze backlinks, domain age, and authority metrics',
      'Evaluate estimated CPC values for commercial keywords',
      'Determine flip potential and estimated resale value'
    ],
    faqs: [
      { q: 'How is the Domain Score calculated?', a: 'Our algorithm scores domains based on keyword search volume, TLD authority, length, pronunciation ease, and SEO metrics like backlink strength.' },
      { q: 'What makes a domain good for flipping?', a: 'Domains with short lengths, commercial keywords, .com extensions, and clean registration history have the highest flip potential.' }
    ]
  },
  emailtool: {
    filename: 'smart-email.html',
    path: '/smart-email',
    title: 'Smart Email Outreach | AI Domains',
    desc: 'Generate cold outreach emails to contact domain owners and negotiate acquisitions.',
    h1: 'Smart Email Outreach',
    intro: 'Create high-converting, professional emails to negotiate purchase deals with domain owners.',
    features: [
      'Choose from premium high-converting negotiation templates',
      'Automatically personalize fields like domain name, price, and author details',
      'Copy to clipboard or open in your default mail client instantly',
      'Track outreach campaigns and templates locally'
    ],
    faqs: [
      { q: 'How do I contact a domain owner?', a: 'You can look up the WHOIS registry details of the domain. If masked, you can use the registrar\'s contact form or standard contact channels.' }
    ]
  },
  bulkcheck: {
    filename: 'bulk-checker.html',
    path: '/bulk-checker',
    title: 'Bulk Domain Checker | AI Domains',
    desc: 'Verify WHOIS availability and check SEO metrics for lists of domains in bulk.',
    h1: 'Bulk Domain Checker',
    intro: 'Paste your domain lists to perform bulk check availability and verify SEO parameters instantly.',
    features: [
      'Verify availability for hundreds of domains simultaneously',
      'Check TLD variants (.com, .net, .org, .io, .ai)',
      'Extract WHOIS registry data instantly',
      'Export bulk checker tables as CSV or JSON'
    ],
    faqs: [
      { q: 'Is there a limit on bulk checks?', a: 'No, but very large lists are checked in batches to respect upstream API rate limits.' }
    ]
  },
  extractor: {
    filename: 'domain-extractor.html',
    path: '/domain-extractor',
    title: 'Domain Extractor | AI Domains',
    desc: 'Extract domain names from text, blocks, URLs, and source code lists.',
    h1: 'Domain Extractor',
    intro: 'Clean up text, logs, and URLs to extract only valid domain names.',
    features: [
      'Parse domain names from raw unformatted text blocks',
      'Extract domains from lists of full URLs',
      'De-duplicate and sort extracted domain lists',
      'Export lists directly to the Bulk Checker or Smart Analyzer'
    ],
    faqs: [
      { q: 'What text formats are supported?', a: 'Any format. The parser uses advanced regular expressions to strip out protocols, query parameters, and plain text, leaving only valid domain structures.' }
    ]
  },
  texttools: {
    filename: 'text-tools.html',
    path: '/text-tools',
    title: 'Text Processing Tools | AI Domains',
    desc: 'Clean, format, and filter word lists for domain generation and keyword research.',
    h1: 'Text Processing Tools',
    intro: 'Process, filter, and clean lists of words to build premium domain generation inputs.',
    features: [
      'Remove special characters, numbers, and spaces from lists',
      'Convert word lists to lowercase instantly',
      'Filter words by character length',
      'Remove duplicate words to prepare clean input lists'
    ],
    faqs: [
      { q: 'How do text tools help domaining?', a: 'They allow you to quickly clean dirty word lists scraped from the web before combining them or loading them into our generators.' }
    ]
  },
  emailextractor: {
    filename: 'email-extractor.html',
    path: '/email-extractor',
    title: 'Email Extractor | AI Domains',
    desc: 'Extract email addresses from text, contact logs, and outreach directories.',
    h1: 'Email Extractor',
    intro: 'Extract and clean lists of email addresses from unformatted raw text.',
    features: [
      'Parse email addresses from large text blocks',
      'Filter out duplicates and invalid email structures',
      'Prepare outreach lists for cold domain emailing',
      'Export parsed lists to CSV format'
    ],
    faqs: [
      { q: 'How are email lists validated?', a: 'The tool checks syntax structure to ensure only syntactically valid email formats are returned.' }
    ]
  },
  newsdomain: {
    filename: 'domain-news.html',
    path: '/domain-news',
    title: 'Domain News Generator | AI Domains',
    desc: 'Get the latest domain aftermarket sales, registration metrics, and trends news.',
    h1: 'Domain News Generator',
    intro: 'Read AI-generated domain market analysis, aftermarket sales, and registration insights.',
    features: [
      'Analyze emerging trends in registry sales',
      'Summarize top sales data from public aftermarket lists',
      'Understand search volume metrics for new domains',
      'Analyze trademark registrations and brand protection news'
    ],
    faqs: [
      { q: 'How is the news data generated?', a: 'The tool uses AI to synthesize registration data, aftermarket sales records, and search trends into clean insights.' }
    ]
  }
};

// Generate SEO Content HTML Block to inject
function generateSeoHtml(toolKey, config) {
  const featuresHtml = config.features.map(f => `<li style="margin-bottom: 8px; display: flex; align-items: start; gap: 8px;"><svg viewBox="0 0 24 24" fill="none" style="width: 16px; height: 16px; color: var(--primary); margin-top: 3px; flex-shrink: 0;"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${f}</span></li>`).join('');
  const faqsHtml = config.faqs.map(faq => `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 12px;">
      <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">${faq.q}</h3>
      <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${faq.a}</p>
    </div>
  `).join('');

  return `
    <!-- SEO Semantic Content & FAQ (Pre-rendered for indexability) -->
    <section class="seo-content-section" style="margin-top: 40px; border-top: 1px solid var(--border); padding-top: 40px; text-align: left;">
      <div style="margin-bottom: 30px;">
        <h2 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">About ${config.h1}</h2>
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">${config.intro}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">${config.desc}</p>
      </div>

      <div style="margin-bottom: 40px;">
        <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">Key Tool Features</h3>
        <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
          ${featuresHtml}
        </ul>
      </div>

      <div class="faq-container">
        <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 16px;">Frequently Asked Questions</h3>
        <div class="faq-list">
          ${faqsHtml}
        </div>
      </div>
      
      <div style="margin-top: 30px; padding: 16px; background: rgba(6, 182, 212, 0.04); border-radius: var(--radius-sm); border: 1px solid rgba(6, 182, 212, 0.15); text-align: center;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 4px;">Looking for other generators?</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">Explore our suite of domain names research and creation tools.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
          <a href="/geo-domains" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(6, 182, 212, 0.1); padding: 4px 10px; border-radius: 4px;">Geo Domains</a>
          <a href="/keyword-domains" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(6, 182, 212, 0.1); padding: 4px 10px; border-radius: 4px;">Keyword Domains</a>
          <a href="/pattern-domains" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(6, 182, 212, 0.1); padding: 4px 10px; border-radius: 4px;">Pattern Domains</a>
          <a href="/brandable-domains" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(6, 182, 212, 0.1); padding: 4px 10px; border-radius: 4px;">Brandable Names</a>
          <a href="/smart-analyzer" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); background: rgba(6, 182, 212, 0.1); padding: 4px 10px; border-radius: 4px;">Smart Analyzer</a>
        </div>
      </div>
    </section>
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
      
      // Inject pre-rendered SEO contents inside panel-container
      const panelContainer = targetPanel.find('.panel-container');
      if (panelContainer.length) {
        panelContainer.append(generateSeoHtml(key, config));
      }
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
