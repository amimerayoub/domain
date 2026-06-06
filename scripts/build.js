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
    about: [
      'Generate location-based domains for local businesses, contractors, service providers, and lead generation sites. Perfect for local SEO campaigns targeting specific geographical areas.',
      'Combine city, state, or regional names with business keywords to target local search intent. Search engines rank local-intent keywords higher when matching domains are registered.',
      'Whether you are building a site for a local service or running a lead generation business, geo domains are a proven way to gain fast organic search traffic.'
    ],
    features: [
      'Generate location-based domains using actual census databases',
      'Select from US, UK, Canada, and Australia cities and regions',
      'Filter and sort domains by city population size',
      'Analyze CPC potential and search intent for keywords',
      'Input custom cities or service keywords easily',
      'Discover high-converting local service domains',
      'Export domain lists to CSV or JSON formats',
      'Check domain registration status in real-time'
    ],
    faqs: [
      { q: 'What is a geo domain?', a: 'A geo domain is a domain name that combines a geographic location with a service keyword, such as DallasPlumbing.com or DenverDentist.com.' },
      { q: 'Why are geo domains valuable for SEO?', a: 'Geo domains target specific local intent. Search engines recognize the semantic relevance of the location + service keyword, helping sites rank faster in local map and organic search results.' },
      { q: 'Can I use custom locations?', a: 'Yes, the generator supports inputting custom location lists, which can be combined with custom service niches.' },
      { q: 'Are geo domains good for lead generation?', a: 'Absolutely. Many local directories and lead capture websites use geo domains to rank quickly and redirect targeted leads to local service providers.' }
    ],
    related: ['keyword', 'brandable', 'suggestor', 'analyzer', 'bulkcheck', 'wordlist']
  },
  keyword: {
    filename: 'keyword-domains.html',
    path: '/keyword-domains',
    title: 'Keyword Domain Generator | AI Domains',
    desc: 'Generate niche-specific domains from seed keywords with premium prefix and suffix combinations.',
    h1: 'Keyword Domain Generator',
    about: [
      'Create keyword-rich domain names for your project or startup. Combine seed keywords with premium prefixes, suffixes, and industry terms to find search-friendly name ideas.',
      'Integrating relevant industry terms into your domain name provides search engines and users with immediate semantic context about what your business does.',
      'Ideal for blogs, niche affiliate sites, digital agencies, and e-commerce stores looking to rank for specific terms.'
    ],
    features: [
      'Combine seed keywords with curated lists of prefixes and suffixes',
      'Select from specialized industry lists like Tech, Finance, Health, and Real Estate',
      'Build custom suffix and prefix lists for tailored generation',
      'Search results are sorted by character length and flow',
      'Filter by character limits to keep names concise',
      'Easily store favorites in your active local session list',
      'Bulk check WHOIS availability instantly',
      'One-click export to standard formats (CSV, JSON)'
    ],
    faqs: [
      { q: 'How do keyword domains help branding?', a: 'Keyword domains clearly communicate your business niche to visitors. For example, "DataFlow" or "CloudSync" immediately signal the software\'s purpose.' },
      { q: 'Are prefix/suffix domains expensive to register?', a: 'No. Most generated names are standard hand-registrations, costing standard rates ($10-$15 per year) rather than premium aftermarket prices.' },
      { q: 'Can I target specific industries?', a: 'Yes, our tool provides hand-curated word categories for industries including Technology, Finance, Health, and Real Estate.' },
      { q: 'Is it better to have keywords in the domain?', a: 'Yes, having a relevant keyword helps with click-through rates (CTR) in search results and establishes immediate domain trust.' }
    ],
    related: ['geo', 'brandable', 'suggestor', 'analyzer', 'bulkcheck', 'wordlist']
  },
  pattern: {
    filename: 'pattern-domains.html',
    path: '/pattern-domains',
    title: 'Pattern Domain Generator | AI Domains',
    desc: 'Create short, highly brandable domains using custom CVC, CVVC, or CVCC pattern combinations.',
    h1: 'Pattern Domain Generator',
    about: [
      'Generate structured brandable domains optimized for startups, SaaS products, AI tools, mobile apps, and modern online businesses using custom consonant and vowel formulas.',
      'Create short, memorable, and highly brandable domain names using proven naming structures such as CVC, CVVC, CVCV, and CVCC patterns. These patterns are widely used for startup branding because they are easy to pronounce, easy to remember, and often available for registration.',
      'Pattern domains are especially popular among founders, marketers, and domain investors looking for premium brand opportunities.'
    ],
    features: [
      'Generate domains using structured patterns including CVC, CVVC, CVCV, VCVC, CVCC, and more',
      'Apply custom vowel and consonant restrictions',
      'Include or exclude specific letters',
      'Generate startup-friendly brand names',
      'Discover short pronounceable domains',
      'Find premium naming opportunities',
      'Export results to CSV or JSON',
      'Check domain availability instantly'
    ],
    faqs: [
      { q: 'What does CVC mean?', a: 'CVC stands for Consonant-Vowel-Consonant. Examples include Bex, Lom, or Tav. These combinations are easy to pronounce and highly valuable for branding.' },
      { q: 'Why are pattern domains valuable?', a: 'Pattern domains are short, memorable, and easy to pronounce. Many successful startups use similar naming structures because they work well across multiple languages and branding campaigns.' },
      { q: 'Which patterns are best for startups?', a: 'Popular startup patterns include CVC, CVVC, CVCV, and VCVC. These patterns often produce strong brandable names.' },
      { q: 'Are generated domains guaranteed to be available?', a: 'No. Availability changes constantly. Always verify registration status before purchasing a domain.' }
    ],
    related: ['geo', 'keyword', 'brandable', 'analyzer', 'suggestor', 'wordlist']
  },
  brandable: {
    filename: 'brandable-domains.html',
    path: '/brandable-domains',
    title: 'Brandable Name Generator | AI Domains',
    desc: 'Create memorable startup names optimized for brand protection and domain flipping.',
    h1: 'Brandable Name Generator',
    about: [
      'Generate catchy, abstract, and brandable domain names tailored for modern startups, SaaS products, and digital agencies. Create a unique brand identity that stands out.',
      'Unlike keyword-stuffed domains, brandable names are distinct, empty-vessel trademarks that you can define. Think of names like Google, Shopify, or Figma.',
      'Our generator uses semantic associations and phonetic structures to deliver pronounceable, short, and highly brandable domain concepts.'
    ],
    features: [
      'Generate abstract names based on semantic associations and syllables',
      'Filter names by exact character count and syllable length',
      'Perfect for modern tech startups, creative agencies, and consumer brands',
      'Check availability for popular TLDs (.com, .io, .ai, .co)',
      'Clean, professional naming suggestions ready for trademark registration',
      'Store and export lists to CSV or JSON formats',
      'Responsive mobile layout for on-the-go brainstorming',
      'Save favorite names across browser sessions'
    ],
    faqs: [
      { q: 'What is a brandable domain name?', a: 'A brandable domain is a made-up or abstract word (like Google, Shopify, or Zoom) that doesn\'t directly describe a service but creates a distinct brand identity.' },
      { q: 'How do I choose between a keyword and a brandable domain?', a: 'Keyword domains are great for instant SEO signals and local services. Brandable domains are ideal for scaling startups, building unique intellectual property, and acquiring trademarks.' },
      { q: 'Are brandable domains easier to register?', a: 'Abstract words are often unregistered, meaning you can register them at standard registration prices instead of paying thousands of dollars for premium aftermarket domains.' },
      { q: 'Can I register these names?', a: 'Yes. All generated names can be checked instantly for registration availability.' }
    ],
    related: ['pattern', 'keyword', 'suggestor', 'analyzer', 'wordlist', 'geo']
  },
  numeric: {
    filename: 'numeric-domains.html',
    path: '/numeric-domains',
    title: 'Numeric Domain Generator | AI Domains',
    desc: 'Generate premium numeric domain names (NNN, NNNN, NNNNN) for liquid digital assets.',
    h1: 'Numeric Domain Generator',
    about: [
      'Generate structured numeric domain names (such as NNN, NNNN, and NNNNN patterns) for liquid digital assets, investment portfolios, and global brands.',
      'Numeric domains are highly sought after by domain investors, particularly in Asian markets, where numbers hold symbolic meaning and represent status.',
      'Because numbers are universal, these domains face no language barriers, making them highly liquid assets that retain and appreciate in value.'
    ],
    features: [
      'Generate structured numeric domains (3-digit, 4-digit, 5-digit combinations)',
      'Exclude historically unpopular numbers like 0 or 4 (e.g. Chinese market preferences)',
      'Create repeating digit patterns (e.g. AAAA, ABAB, AABB)',
      'Verify domain availability in bulk using WHOIS lookups',
      'Export numeric lists directly to CSV or JSON formats',
      'Monitor liquid digital asset opportunities across popular TLDs',
      'Responsive mobile layout for digital asset managers',
      'Fast, lightweight generation with no performance lag'
    ],
    faqs: [
      { q: 'Why are numeric domains valuable?', a: 'Numbers are universal and carry no language barriers. Short numeric domains (like 3-digit and 4-digit .com names) are highly liquid and act as premium stores of value.' },
      { q: 'What do NNNN and NNNNN mean?', a: 'N stands for Number. NNNN represents a 4-digit domain (e.g., 8888.com), and NNNNN represents a 5-digit domain.' },
      { q: 'Why filter out numbers like 0 or 4?', a: 'In Chinese culture, the number 4 sounds like "death" (unlucky) and 0 represents "nothingness". Excluding them increases the asset\'s resale value in those markets.' },
      { q: 'Are numeric domains a good investment?', a: 'Short numeric .com domains (3-digit and 4-digit) have historically held and increased their value due to extreme scarcity.' }
    ],
    related: ['pattern', 'brandable', 'analyzer', 'bulkcheck', 'wordlist', 'geo']
  },
  suggestor: {
    filename: 'domain-suggestor.html',
    path: '/domain-suggestor',
    title: 'AI Domain Suggestor | AI Domains',
    desc: 'Get smart, AI-powered domain name suggestions based on your business description or keywords.',
    h1: 'Domain Suggestor',
    about: [
      'Get smart, context-rich domain suggestions based on your business description or keywords.',
      'Describe your business or project idea and let our semantic suggestor recommend creative, available domain names.',
      'Instead of simple keyword stitching, the tool analyzes the semantic meaning of your business description to generate names that are contextually relevant and highly brandable.'
    ],
    features: [
      'Semantic domain recommendations based on project descriptions',
      'Input plain English description of your business or app',
      'Filter suggestions by extensions, categories, and length',
      'Perform real-time bulk check availability',
      'Clean, professional suggestions ready for registration',
      'Store and export lists to CSV or JSON formats',
      'Responsive layout for mobile brainstorming',
      'Save favorite names across browser sessions'
    ],
    faqs: [
      { q: 'How does the domain suggestor use AI?', a: 'It analyzes the semantic meaning of your business description to generate names that are contextually relevant, rather than just doing simple keyword combinations.' },
      { q: 'Can I type full sentences?', a: 'Yes, you can describe your project in full sentences, like "A platform for renting surfboards in California." The suggestor will extract the key concepts and generate relevant domains.' },
      { q: 'What domain extensions (TLDs) are supported?', a: 'It supports .com, .net, .org, .co, .io, .ai, and many other popular extensions.' },
      { q: 'Is the suggestor free to use?', a: 'Yes, the AI domain suggestor is completely free for all users.' }
    ],
    related: ['keyword', 'brandable', 'analyzer', 'wordlist', 'geo', 'bulkcheck']
  },
  wordlist: {
    filename: 'wordlist-combiner.html',
    path: '/wordlist-combiner',
    title: 'WordList Combiner | AI Domains',
    desc: 'Combine custom prefix and suffix word lists to generate bulk domain name combinations.',
    h1: 'WordList Combiner',
    about: [
      'Combine two custom lists of words to create massive sets of domain name variations instantly. Paste or upload your own prefix and suffix lists and combine them with a single click.',
      'Perfect for domain investors, founders, and agencies looking to generate thousands of combinations of brand names and check their availability in bulk.',
      'Get instant results and filter your list to keep only the best matches.'
    ],
    features: [
      'Combine two custom lists of prefixes and suffixes',
      'Create massive variations with a single click',
      'Filter combinations by character length and extension',
      'Verify domain availability in bulk using WHOIS lookups',
      'Export combined lists to CSV or JSON formats',
      'Save favorites across browser sessions',
      'Clean interface optimized for large lists',
      'Dark and light mode compatible'
    ],
    faqs: [
      { q: 'How many combinations can I check?', a: 'You can check up to thousands of combinations. Results are batched and checked asynchronously to ensure fast load times.' },
      { q: 'What is a wordlist combiner?', a: 'A wordlist combiner takes list A (e.g. prefixes like "get", "go", "my") and list B (e.g. niches like "app", "site", "hub") and multiplies them to create "getapp.com", "getsite.com", etc.' },
      { q: 'Can I add custom suffixes?', a: 'Yes, you can input any list of custom words in the suffix column.' },
      { q: 'Is there a limit to list sizes?', a: 'While there is no strict limit, list sizes under 500 words per column are recommended for optimal browser performance.' }
    ],
    related: ['keyword', 'geo', 'suggestor', 'analyzer', 'bulkcheck', 'texttools']
  },
  analyzer: {
    filename: 'smart-analyzer.html',
    path: '/smart-analyzer',
    title: 'Smart Domain Analyzer | AI Domains',
    desc: 'Analyze domain SEO metrics, age, backlinks, and flip potential instantly.',
    h1: 'Smart Domain Analyzer',
    about: [
      'Analyze domain SEO metrics, age, backlinks, and flip potential instantly. Input any domain list to evaluate domain authority, backlink metrics, CPC keywords, and overall investment quality.',
      'Calculate an instant AI-powered Domain Score (0-100) to understand the resale and SEO value of a domain name.',
      'Perfect for evaluating domains before purchase, negotiating prices, or auditing your own domain portfolio.'
    ],
    features: [
      'Calculate instant Domain Score (0-100) based on multiple metrics',
      'Analyze backlinks, domain age, and authority parameters',
      'Evaluate estimated CPC values for commercial keywords',
      'Determine flip potential and estimated resale value',
      'Filter domain lists by age, authority score, or length',
      'Export bulk checker tables as CSV or JSON',
      'Check WHOIS registration status in real-time',
      'Compare multiple domains side by side'
    ],
    faqs: [
      { q: 'How is the Domain Score calculated?', a: 'Our algorithm scores domains based on keyword search volume, TLD authority, length, pronunciation ease, and SEO metrics like backlink strength.' },
      { q: 'What makes a domain good for flipping?', a: 'Domains with short lengths, commercial keywords, .com extensions, and clean registration history have the highest flip potential.' },
      { q: 'Why is domain age important?', a: 'Search engines tend to trust older domains that have a history of clean backlinks and content, which can help new websites rank faster.' },
      { q: 'Can I analyze domains in bulk?', a: 'Yes, you can analyze lists of domains at once to find the most valuable assets.' }
    ],
    related: ['bulkcheck', 'extractor', 'suggestor', 'keyword', 'geo', 'emailtool']
  },
  emailtool: {
    filename: 'smart-email.html',
    path: '/smart-email',
    title: 'Smart Email Outreach | AI Domains',
    desc: 'Generate cold outreach emails to contact domain owners and negotiate acquisitions.',
    h1: 'Smart Email Outreach',
    about: [
      'Generate cold outreach emails to contact domain owners and negotiate acquisitions. Create high-converting, professional emails to negotiate purchase deals with domain owners.',
      'Choose from premium high-converting negotiation templates and automatically personalize fields like domain name, price, and author details.',
      'Streamline your acquisition workflow and increase your reply rates with domain-focused pitch templates.'
    ],
    features: [
      'Generate cold outreach emails optimized for domain acquisition',
      'Choose from multiple high-converting negotiation templates',
      'Automatically personalize domain, price, and contact fields',
      'Copy email body and subject line to clipboard instantly',
      'Open templates directly in your default mail client',
      'Track outreach status and templates locally',
      'Professional email formatting suitable for business negotiations',
      'Mobile responsive layout for negotiators on the go'
    ],
    faqs: [
      { q: 'How do I contact a domain owner?', a: 'You can look up the WHOIS registry details of the domain. If masked, you can use the registrar\'s contact form or standard contact channels.' },
      { q: 'What is a good starting offer?', a: 'Starting offers depend on the domain\'s value, but typically offer a reasonable base (e.g. $100-$500) to spark a response without insulting the owner.' },
      { q: 'How can I improve my outreach response rates?', a: 'Keep emails short, professional, and clear. State your budget or ask if they are open to offers, and send from a professional email address.' },
      { q: 'Is my email template secure?', a: 'Yes. All email generations and inputs are processed locally on your device and are never sent to our servers.' }
    ],
    related: ['emailextractor', 'analyzer', 'bulkcheck', 'extractor', 'keyword', 'geo']
  },
  bulkcheck: {
    filename: 'bulk-checker.html',
    path: '/bulk-checker',
    title: 'Bulk Domain Checker | AI Domains',
    desc: 'Verify WHOIS availability and check SEO metrics for lists of domains in bulk.',
    h1: 'Bulk Domain Checker',
    about: [
      'Verify WHOIS availability and check SEO metrics for lists of domains in bulk. Paste your domain lists to perform bulk check availability and verify SEO parameters instantly.',
      'Ideal for domainers, developers, and agencies who need to verify the availability of large domain portfolios quickly.',
      'Save time and automate your domain checking process with our fast local checker.'
    ],
    features: [
      'Verify availability for hundreds of domains simultaneously',
      'Check TLD variants (.com, .net, .org, .io, .ai)',
      'Extract WHOIS registry data instantly',
      'Export bulk checker tables as CSV or JSON',
      'Filter results by availability or extension type',
      'Safe, rate-limited checks to prevent upstream API blocking',
      'Clean, tabbed user interface for easy navigation',
      'Local storage support to prevent loss of results'
    ],
    faqs: [
      { q: 'Is there a limit on bulk checks?', a: 'No, but very large lists are checked in batches to respect upstream API rate limits.' },
      { q: 'What TLDs are supported?', a: 'All major generic TLDs (.com, .net, .org) and popular country-code or niche TLDs (.io, .ai, .co).' },
      { q: 'Can I export my results?', a: 'Yes, you can export all checked domains as CSV or JSON.' },
      { q: 'Are these checks anonymous?', a: 'Yes. The WHOIS lookups are executed through proxy queries, so the domains are not tracked or registered by third parties.' }
    ],
    related: ['analyzer', 'extractor', 'suggestor', 'wordlist', 'keyword', 'geo']
  },
  extractor: {
    filename: 'domain-extractor.html',
    path: '/domain-extractor',
    title: 'Domain Extractor | AI Domains',
    desc: 'Extract domain names from text, blocks, URLs, and source code lists.',
    h1: 'Domain Extractor',
    about: [
      'Extract domain names from text, blocks, URLs, and source code lists. Clean up text, logs, and URLs to extract only valid domain names.',
      'The parser uses advanced regular expressions to strip out protocols, query parameters, and plain text, leaving only valid domain structures.',
      'Perfect for cleaning up analytics logs, list scrapes, or raw markdown links.'
    ],
    features: [
      'Parse domain names from raw unformatted text blocks',
      'Extract domains from lists of full URLs',
      'De-duplicate and sort extracted domain lists',
      'Export lists directly to the Bulk Checker or Smart Analyzer',
      'Support parsing emails and cleaning trailing characters',
      'Copy extracted results to clipboard instantly',
      'Fast, client-side regex processing',
      'Complete privacy: all data processed in-browser'
    ],
    faqs: [
      { q: 'What text formats are supported?', a: 'Any format. The parser uses advanced regular expressions to strip out protocols, query parameters, and plain text, leaving only valid domain structures.' },
      { q: 'Can I extract domains from HTML source code?', a: 'Yes, you can paste raw HTML source and the extractor will extract all domain names from href attributes, text, or script tags.' },
      { q: 'Is there a size limit to the text I can paste?', a: 'The tool runs entirely in your browser, so it can handle text blocks up to several megabytes depending on your device\'s memory.' },
      { q: 'Is my data private?', a: 'Yes. All extraction is done locally in your browser. None of your text is sent to our servers.' }
    ],
    related: ['texttools', 'emailextractor', 'bulkcheck', 'analyzer', 'keyword', 'geo']
  },
  texttools: {
    filename: 'text-tools.html',
    path: '/text-tools',
    title: 'Text Processing Tools | AI Domains',
    desc: 'Clean, format, and filter word lists for domain generation and keyword research.',
    h1: 'Text Processing Tools',
    about: [
      'Clean, format, and filter word lists for domain generation and keyword research. Process, filter, and clean lists of words to build premium domain generation inputs.',
      'Remove special characters, numbers, and spaces from lists, convert to lowercase, and filter words by character length.',
      'Optimize your inputs for our domain generators and improve the quality of your brand ideas.'
    ],
    features: [
      'Remove special characters, numbers, and spaces from word lists',
      'Convert word lists to lowercase instantly',
      'Filter words by specific character length ranges',
      'Remove duplicate words to prepare clean input lists',
      'Add custom prefixes or suffixes to entire lists',
      'Sort lists alphabetically or by length',
      'Copy cleaned lists to clipboard with one click',
      'Clean interface optimized for large lists'
    ],
    faqs: [
      { q: 'How do text tools help domaining?', a: 'They allow you to quickly clean dirty word lists scraped from the web before combining them or loading them into our generators.' },
      { q: 'Can I remove duplicates?', a: 'Yes, the duplicate remover is built-in and processes lists instantly.' },
      { q: 'What character filters are available?', a: 'You can filter out words that are too short or too long, as well as words containing non-alphabetic characters.' },
      { q: 'Does it support CSV input?', a: 'Yes, you can paste comma-separated or line-separated word lists.' }
    ],
    related: ['extractor', 'wordlist', 'emailextractor', 'keyword', 'geo', 'suggestor']
  },
  emailextractor: {
    filename: 'email-extractor.html',
    path: '/email-extractor',
    title: 'Email Extractor | AI Domains',
    desc: 'Extract email addresses from text, contact logs, and outreach directories.',
    h1: 'Email Extractor',
    about: [
      'Extract email addresses from text, contact logs, and outreach directories. Extract and clean lists of email addresses from unformatted raw text.',
      'The tool checks syntax structure to ensure only syntactically valid email formats are returned.',
      'Perfect for building outreach lists for domain sales, content promotion, or marketing campaigns.'
    ],
    features: [
      'Parse email addresses from large text blocks',
      'Filter out duplicates and invalid email structures',
      'Prepare outreach lists for cold domain emailing',
      'Export parsed lists to CSV format',
      'Clean results by domain name filter',
      'Copy extracted emails to clipboard instantly',
      'Fast, client-side regex processing',
      'Complete privacy: all data processed in-browser'
    ],
    faqs: [
      { q: 'How are email lists validated?', a: 'The tool checks syntax structure using RFC-compliant regular expressions to ensure only syntactically valid email formats are returned.' },
      { q: 'Can I extract emails from HTML code?', a: 'Yes, you can paste raw HTML and the extractor will parse out all email addresses.' },
      { q: 'Is my email list saved?', a: 'No. The email extractor works completely client-side. Your lists are never sent to a server.' },
      { q: 'Can I sort the extracted emails?', a: 'Yes, the tool automatically de-duplicates and lists them alphabetically.' }
    ],
    related: ['emailtool', 'extractor', 'texttools', 'bulkcheck', 'analyzer', 'keyword']
  },
  newsdomain: {
    filename: 'domain-news.html',
    path: '/domain-news',
    title: 'Domain News Generator | AI Domains',
    desc: 'Get the latest domain aftermarket sales, registration metrics, and trends news.',
    h1: 'Domain News Generator',
    about: [
      'Get the latest domain aftermarket sales, registration metrics, and trends news. Read AI-generated domain market analysis, aftermarket sales, and registration insights.',
      'Analyze emerging trends in registry sales and summarize top sales data from public aftermarket lists.',
      'Stay informed on premium naming movements, new gTLD registries, and high-value sales metrics.'
    ],
    features: [
      'Analyze emerging trends in registry sales',
      'Summarize top sales data from public aftermarket lists',
      'Understand search volume metrics for new domains',
      'Analyze trademark registrations and brand protection news',
      'Generate domain market reports based on recent sales',
      'Compare valuation and sales trends over time',
      'Copy reports to clipboard instantly',
      'Optimized for domain brokers and investors'
    ],
    faqs: [
      { q: 'How is the news data generated?', a: 'The tool uses AI to synthesize registration data, aftermarket sales records, and search trends into clean insights.' },
      { q: 'How often is news updated?', a: 'The analysis updates regularly to reflect current domain market reports and trends.' },
      { q: 'Can I copy the reports for my blog?', a: 'Yes, the summaries and analyses are generated for public domain research and educational purposes.' },
      { q: 'What sales are monitored?', a: 'We track high-value public sales from major aftermarket platforms like Sedo, Afternic, and GoDaddy.' }
    ],
    related: ['analyzer', 'bulkcheck', 'suggestor', 'keyword', 'geo', 'brandable']
  }
};

// Generate SEO Content HTML Block to inject
function generateSeoHtml(toolKey, config) {
  const aboutHtml = config.about.map(p => `<p class="seo-paragraph">${p}</p>`).join('');
  const featuresHtml = config.features.map(f => `
    <li class="seo-feature-item">
      <span class="seo-feature-icon">✓</span>
      <span>${f}</span>
    </li>
  `).join('');
  const faqsHtml = config.faqs.map(faq => `
    <div class="seo-faq-item">
      <h3 class="seo-faq-question">${faq.q}</h3>
      <p class="seo-faq-answer">${faq.a}</p>
    </div>
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
    <div class="seo-grid">
      <div class="seo-column-main">
        <div class="seo-card">
          <h2 class="seo-title-h2">About ${config.h1}</h2>
          ${aboutHtml}
        </div>
        
        <div class="seo-card">
          <h2 class="seo-title-h2">Frequently Asked Questions</h2>
          <div class="seo-faq-list">
            ${faqsHtml}
          </div>
        </div>
      </div>
      
      <div class="seo-column-side">
        <div class="seo-card">
          <h2 class="seo-title-h2">Key Tool Features</h2>
          <ul class="seo-feature-list">
            ${featuresHtml}
          </ul>
        </div>
        
        <div class="seo-card">
          <h2 class="seo-title-h2">Related Domain Tools</h2>
          <div class="seo-related-grid">
            ${relatedHtml}
          </div>
        </div>
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

    // Inject all SEO tool content blocks inside #seoContentSection
    const seoContentSection = $('#seoContentSection');
    if (seoContentSection.length) {
      let seoHtml = '';
      for (const [tKey, tConfig] of Object.entries(toolConfigs)) {
        const isActive = tKey === key;
        seoHtml += `
      <div id="seo-content-${tKey}" class="seo-tool-content${isActive ? ' active' : ''}">
        ${generateSeoHtml(tKey, tConfig)}
      </div>\n`;
      }
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
