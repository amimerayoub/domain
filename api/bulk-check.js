/**
 * /api/bulk-check.js
 * Bulk Domain Availability — Verisign sugapi
 * GET  ?names=Zynora,Veltrix&tlds=com,io
 * POST { "names": [...], "tlds": [...] }
 */

const VERISIGN_API = 'https://sugapi.verisign-grs.com/ns-api/2.0/bulk-check';
const MAX_NAMES    = 100;
const MAX_TLDS     = 3;

const VERISIGN_TLDS = ['com', 'net'];
const RDAP_SERVERS = {
  com:'https://rdap.verisign.com/com/v1',     net:'https://rdap.verisign.com/net/v1',
  org:'https://rdap.publicinterestregistry.org/rdap', io:'https://rdap.nic.io',
  co:'https://rdap.nic.co',                   ai:'https://rdap.nic.ai',
  app:'https://rdap.nic.google',              dev:'https://rdap.nic.google',
  info:'https://rdap.afilias.net/rdap/info',  biz:'https://rdap.nic.biz',
  us:'https://rdap.nic.us',                   me:'https://rdap.nic.me',
  xyz:'https://rdap.nic.xyz',                 tech:'https://rdap.nic.tech',
  uk:'https://rdap.nominet.uk',               de:'https://rdap.denic.de',
};
const RDAP_BOOTSTRAP = 'https://rdap.org/domain';
const DOH_URL = 'https://cloudflare-dns.com/dns-query';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function cleanName(s) { return s.trim().replace(/\..*$/, '').replace(/[^a-zA-Z0-9\-]/g, ''); }
function cleanTld(s)  { return s.trim().replace(/^\./, '').toLowerCase().replace(/[^a-z0-9\-]/g, ''); }
function chunk(arr, n) { const r=[]; for(let i=0;i<arr.length;i+=n) r.push(arr.slice(i,i+n)); return r; }

async function safeFetch(url, options = {}, { timeout = 8000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return r;
    } catch (err) {
      clearTimeout(id);
      lastErr = err;
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}

async function rdapAvailabilityCheck(domain, tld) {
  const server = RDAP_SERVERS[tld] || RDAP_BOOTSTRAP;
  const url = `${server}/domain/${domain.toUpperCase()}`;
  try {
    const r = await safeFetch(url, {
      headers: { Accept: 'application/rdap+json,application/json,*/*', 'User-Agent': 'DomainKit/2.0' }
    }, { timeout: 4000, retries: 1 });
    
    if (r.status === 404) return 'available';
    if (r.ok) {
      const j = await r.json();
      if (j && j.handle) return 'taken';
    }
  } catch (_) {}

  // Fallback to DNS records check (NS type) via Cloudflare DoH
  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=NS`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && (j.Answer && j.Answer.length > 0)) {
        return 'taken';
      }
    }
  } catch (_) {}

  // Fallback to DNS records check (A type) via Cloudflare DoH
  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && (j.Answer && j.Answer.length > 0)) {
        return 'taken';
      }
    }
  } catch (_) {}

  return 'unknown';
}

async function verisignBulk(names, tlds, includeRegistered) {
  const params = new URLSearchParams({ names: names.join(','), tlds: tlds.join(','), 'include-registered': String(includeRegistered) });
  const res = await safeFetch(`${VERISIGN_API}?${params}`, {
    headers: {
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Origin': 'https://dnhub.io',
      'Referer': 'https://dnhub.io/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36',
      'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'cross-site', 'Sec-GPC': '1',
    }
  }, { timeout: 8000, retries: 1 });
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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  let rawNames, rawTlds, includeRegistered = true, debug = false;
  if (req.method === 'GET') {
    rawNames = (req.query.names || req.query.name || '').split(',').map(s=>s.trim()).filter(Boolean);
    rawTlds  = (req.query.tlds  || req.query.tld  || 'com').split(',').map(s=>s.trim()).filter(Boolean);
    includeRegistered = req.query['include-registered'] !== 'false';
    debug = req.query.debug === '1' || req.query.debug === 'true';
  } else if (req.method === 'POST') {
    const b  = req.body || {};
    const n  = b.names || b.name || [];
    const t  = b.tlds  || b.tld  || ['com'];
    rawNames = (Array.isArray(n) ? n : String(n).split(',')).map(s=>s.trim()).filter(Boolean);
    rawTlds  = (Array.isArray(t) ? t : String(t).split(',')).map(s=>s.trim()).filter(Boolean);
    includeRegistered = b['include-registered'] !== false;
    debug = b.debug === '1' || b.debug === 'true';
  } else return res.status(405).json({ success:false, error:'Method not allowed' });

  if (!rawNames.length) return res.status(400).json({ success:false, error:'No names provided.', usage:'GET /api/bulk-check?names=Zynora,Veltrix&tlds=com,io' });

  const names  = [...new Set(rawNames.map(cleanName).filter(Boolean))];
  const tlds   = [...new Set(rawTlds.map(cleanTld).filter(Boolean))].slice(0, MAX_TLDS);
  if (!names.length) return res.status(400).json({ success:false, error:'All names were invalid.' });

  const t0 = Date.now();
  const allResults = [], errors = [];
  const timings = { batches: [] };

  const verisignTlds = tlds.filter(t => VERISIGN_TLDS.includes(t));
  const fallbackTlds = tlds.filter(t => !VERISIGN_TLDS.includes(t));

  const nameBatches = chunk(names, 20);
  for (let i = 0; i < nameBatches.length; i++) {
    const batch = nameBatches[i];
    const tStart = Date.now();
    let batchOk = true;
    let batchError = null;

    // 1. Verisign check for Verisign TLDs
    if (verisignTlds.length > 0) {
      try {
        const d = await verisignBulk(batch, verisignTlds, includeRegistered);
        if (Array.isArray(d.results)) {
          allResults.push(...d.results);
        }
      } catch (e) {
        batchOk = false;
        batchError = e.message;
        errors.push(`Verisign batch error: ${e.message}`);
        // Populate unknown results for this batch's Verisign TLDs
        for (const name of batch) {
          for (const tld of verisignTlds) {
            allResults.push({
              name: `${name}.${tld}`,
              availability: 'unknown'
            });
          }
        }
      }
    }

    // 2. Fallback check for fallback TLDs
    if (fallbackTlds.length > 0) {
      const fallbackPromises = [];
      for (const name of batch) {
        for (const tld of fallbackTlds) {
          const domain = `${name}.${tld}`;
          fallbackPromises.push((async () => {
            try {
              const status = await rdapAvailabilityCheck(domain, tld);
              return {
                name: domain,
                availability: status
              };
            } catch (e) {
              return {
                name: domain,
                availability: 'unknown'
              };
            }
          })());
        }
      }
      const fallbackResults = await Promise.all(fallbackPromises);
      allResults.push(...fallbackResults);
    }

    timings.batches.push({
      id: i + 1,
      size: batch.length,
      elapsed_ms: Date.now() - tStart,
      ok: batchOk,
      ...(batchError ? { error: batchError } : {})
    });
  }

  if (!allResults.length && errors.length) return res.status(502).json({ success:false, error:'Upstream failed.', details:errors });

  const { available, registered, byName, byTld } = enrich(allResults);

  const payload = {
    success:true, checked_at:new Date().toISOString(), elapsed_ms: Date.now()-t0,
    input: { names, tlds, total_checked: allResults.length },
    summary: { total:allResults.length, available:available.length, registered:registered.length, availability_rate:`${allResults.length ? Math.round(available.length/allResults.length*100) : 0}%` },
    results: { available, registered, all: allResults.map(r=>({ domain:r.name.toLowerCase(), availability:r.availability, available:r.availability==='available' })) },
    by_name: Object.values(byName), by_tld: Object.values(byTld),
    errors: errors.length ? errors : undefined,
  };

  if (debug) {
    payload._debug = {
      elapsed_ms: Date.now() - t0,
      batches: timings.batches
    };
  }

  return res.status(200).json(payload);
}
