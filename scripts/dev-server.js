const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Helper functions copied from api/bulk-check.js
const VERISIGN_API = 'https://sugapi.verisign-grs.com/ns-api/2.0/bulk-check';
const MAX_NAMES    = 100;
const MAX_TLDS     = 10;

function cleanName(s) { return s.trim().replace(/\..*$/, '').replace(/[^a-zA-Z0-9\-]/g, ''); }
function cleanTld(s)  { return s.trim().replace(/^\./, '').toLowerCase().replace(/[^a-z0-9\-]/g, ''); }
function chunk(arr, n) { const r=[]; for(let i=0;i<arr.length;i+=n) r.push(arr.slice(i,i+n)); return r; }

async function verisignBulk(names, tlds, includeRegistered) {
  const params = new URLSearchParams({ names: names.join(','), tlds: tlds.join(','), 'include-registered': String(includeRegistered) });
  const res = await fetch(`${VERISIGN_API}?${params}`, {
    headers: {
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Origin': 'https://dnhub.io',
      'Referer': 'https://dnhub.io/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36',
    }
  });
  if (!res.ok) throw new Error(`Verisign ${res.status}`);
  return res.json();
}

function enrich(results) {
  const available = [], registered = [], byName = {}, byTld = {};
  for (const item of results) {
    const dot  = item.name.lastIndexOf('.');
    const base = dot > -1 ? item.name.slice(0, dot)  : item.name;
    const tld  = dot > -1 ? item.name.slice(dot + 1) : '';
    const ok   = item.availability === 'available';
    const e    = {
      domain: item.name.toLowerCase(), name: base, tld: tld.toLowerCase(),
      availability: item.availability, available: ok, taken: !ok,
      register_url: ok ? `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(item.name.toLowerCase())}` : null,
      whois_url: `https://lookup.icann.org/en/lookup?name=${encodeURIComponent(item.name.toLowerCase())}`,
    };
    if (ok) available.push(e); else registered.push(e);
    if (!byName[base]) byName[base] = { name: base, results: [] }; byName[base].results.push(e);
    if (!byTld[tld])   byTld[tld]  = { tld,  results: [] };        byTld[tld].results.push(e);
  }
  return { available, registered, byName, byTld };
}

// Bulk Check API handler
app.post('/api/bulk-check', async (req, res) => {
  try {
    const b  = req.body || {};
    const n  = b.names || b.name || [];
    const t  = b.tlds  || b.tld  || ['com'];
    let rawNames = (Array.isArray(n) ? n : String(n).split(',')).map(s=>s.trim()).filter(Boolean);
    let rawTlds  = (Array.isArray(t) ? t : String(t).split(',')).map(s=>s.trim()).filter(Boolean);
    const includeRegistered = b['include-registered'] !== false;

    if (!rawNames.length) return res.status(400).json({ success:false, error:'No names provided.' });

    const names  = [...new Set(rawNames.map(cleanName).filter(Boolean))];
    const tlds   = [...new Set(rawTlds.map(cleanTld).filter(Boolean))].slice(0, MAX_TLDS);
    
    const t0 = Date.now();
    const allResults = [], errors = [];
    await Promise.allSettled(chunk(names, MAX_NAMES).map(async batch => {
      try { 
        const d = await verisignBulk(batch, tlds, includeRegistered); 
        if (Array.isArray(d.results)) allResults.push(...d.results); 
      } catch(e) { 
        errors.push(e.message); 
      }
    }));

    if (!allResults.length && errors.length) return res.status(502).json({ success:false, error:'Upstream failed.', details:errors });

    const { available, registered, byName, byTld } = enrich(allResults);

    return res.status(200).json({
      success:true, checked_at:new Date().toISOString(), elapsed_ms: Date.now()-t0,
      input: { names, tlds, total_checked: allResults.length },
      summary: { total:allResults.length, available:available.length, registered:registered.length, availability_rate:`${allResults.length ? Math.round(available.length/allResults.length*100) : 0}%` },
      results: { available, registered, all: allResults.map(r=>({ domain:r.name.toLowerCase(), availability:r.availability, available:r.availability==='available' })) },
      by_name: Object.values(byName), by_tld: Object.values(byTld),
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error('Local bulk-check api error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Route catch-all to serve compiled static files matching path
app.get('/:tool', (req, res, next) => {
  const tool = req.params.tool;
  const filePath = path.join(__dirname, '..', `${tool}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
});
