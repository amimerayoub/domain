const fs = require('fs');
const OG_IMAGE = '/assets/graph/image1.png';
const SEO_TITLE = 'AI Domains - Generate, Analyze & Discover Premium Domain Names';
const SEO_DESC = 'AI-powered domain generator featuring Geo Domains, Keyword Domains, Pattern Domains, Brandable Names, Smart Analyzer, Smart Email Outreach, Domain Research Tools and Premium Domain Discovery.';

const files = ['landing.html','about.html','contact.html','privacy.html','security.html','terms.html','blog.html','blog-dashboard.html','article.html','domain.html'];

files.forEach(f => {
  const path = require('path').join(__dirname, '..', f);
  if (!fs.existsSync(path)) return;
  let h = fs.readFileSync(path, 'utf8');
  const orig = h;

  if (!h.includes('og:image')) {
    const ogBlock = [
      '  <meta property="og:title" content="' + SEO_TITLE + '">',
      '  <meta property="og:description" content="' + SEO_DESC + '">',
      '  <meta property="og:image" content="' + OG_IMAGE + '">',
      '  <meta property="og:type" content="website">',
      '  <meta property="twitter:card" content="summary_large_image">',
      '  <meta property="twitter:title" content="' + SEO_TITLE + '">',
      '  <meta property="twitter:description" content="' + SEO_DESC + '">',
      '  <meta property="twitter:image" content="' + OG_IMAGE + '">',
    ].join('\n');
    h = h.replace(/<\/head>/i, ogBlock + '\n</head>');
  } else if (!h.includes('twitter:card')) {
    const twitterBlock = [
      '  <meta property="twitter:card" content="summary_large_image">',
      '  <meta property="twitter:image" content="' + OG_IMAGE + '">',
    ].join('\n');
    h = h.replace(/<\/head>/i, twitterBlock + '\n</head>');
  }

  if (h !== orig) {
    fs.writeFileSync(path, h, 'utf8');
    console.log('✓ Fixed: ' + f);
  } else {
    console.log('- No change: ' + f);
  }
});
