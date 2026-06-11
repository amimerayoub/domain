/**
 * /api/bulk-check.js
 * Bulk Domain Availability — Verisign sugapi
 * GET  ?names=Zynora,Veltrix&tlds=com,io
 * POST { "names": [...], "tlds": [...] }
 */

const VERISIGN_API = 'https://sugapi.verisign-grs.com/ns-api/2.0/bulk-check';
const MAX_NAMES    = 100;
const MAX_TLDS     = 3;

const VERISIGN_TLDS = ['com', 'net', 'org', 'vip'];
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

async function processDomainBatch(batch, includeRegistered) {
  const verisignGroup = [];
  const rdapGroup = [];
  const resultsMap = {};

  for (const item of batch) {
    if (VERISIGN_TLDS.includes(item.tld)) {
      verisignGroup.push(item);
    } else {
      rdapGroup.push(item);
    }
  }

  // 1. Check Verisign-supported domains
  const failedVerisignDomains = [];
  if (verisignGroup.length > 0) {
    const tldGroups = {};
    for (const item of verisignGroup) {
      if (!tldGroups[item.tld]) tldGroups[item.tld] = [];
      tldGroups[item.tld].push(item.name);
    }

    const verisignPromises = Object.entries(tldGroups).map(async ([tld, names]) => {
      try {
        const data = await verisignBulk(names, [tld], includeRegistered);
        if (data && Array.isArray(data.results)) {
          for (const res of data.results) {
            const domainLower = res.name.toLowerCase();
            resultsMap[domainLower] = {
              name: res.name,
              availability: res.availability
            };
          }
        }
        for (const name of names) {
          const domain = `${name}.${tld}`;
          const domainLower = domain.toLowerCase();
          if (!resultsMap[domainLower]) {
            failedVerisignDomains.push({ name, tld, domain });
          }
        }
      } catch (e) {
        for (const name of names) {
          failedVerisignDomains.push({ name, tld, domain: `${name}.${tld}` });
        }
      }
    });
    await Promise.allSettled(verisignPromises);
  }

  // 2. Check fallback TLDs and failed Verisign domains via RDAP
  const rdapCheckDomains = [...rdapGroup, ...failedVerisignDomains];
  if (rdapCheckDomains.length > 0) {
    const rdapPromises = rdapCheckDomains.map(async item => {
      const status = await rdapAvailabilityCheck(item.domain, item.tld);
      const domainLower = item.domain.toLowerCase();
      if (status === 'available') {
        resultsMap[domainLower] = { name: item.domain, availability: 'available' };
      } else if (status === 'taken') {
        resultsMap[domainLower] = { name: item.domain, availability: 'registered' };
      } else {
        resultsMap[domainLower] = { name: item.domain, availability: 'unknown' };
      }
    });
    await Promise.allSettled(rdapPromises);
  }

  // 3. Ensure all requested domains in the batch have a result
  for (const item of batch) {
    const domainLower = item.domain.toLowerCase();
    if (!resultsMap[domainLower]) {
      resultsMap[domainLower] = { name: item.domain, availability: 'unknown' };
    }
  }

  return batch.map(item => resultsMap[item.domain.toLowerCase()]);
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

  // Generate flat list of domain name + TLD pairs
  const requestedDomains = [];
  for (const name of names) {
    for (const tld of tlds) {
      requestedDomains.push({ name, tld, domain: `${name}.${tld}` });
    }
  }

  // Chunk domains list into batches of 100 max
  const domainBatches = chunk(requestedDomains, 100);

  // Process batches in parallel via Promise.allSettled
  const batchPromises = domainBatches.map(async (batch, index) => {
    const tStart = Date.now();
    try {
      const results = await processDomainBatch(batch, includeRegistered);
      return { index, ok: true, results, elapsed_ms: Date.now() - tStart };
    } catch (err) {
      errors.push(`Batch ${index + 1} failed: ${err.message}`);
      const fallbackResults = batch.map(item => ({ name: item.domain, availability: 'unknown' }));
      return { index, ok: false, results: fallbackResults, elapsed_ms: Date.now() - tStart, error: err.message };
    }
  });

  const settled = await Promise.allSettled(batchPromises);

  // Merge results in correct order
  const orderedBatches = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      orderedBatches.push(r.value);
      timings.batches.push({
        id: r.value.index + 1,
        size: r.value.results.length,
        elapsed_ms: r.value.elapsed_ms,
        ok: r.value.ok,
        ...(r.value.error ? { error: r.value.error } : {})
      });
    } else {
      errors.push(`Promise rejected: ${r.reason?.message || 'Unknown error'}`);
    }
  }

  orderedBatches.sort((a, b) => a.index - b.index);
  for (const b of orderedBatches) {
    allResults.push(...b.results);
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
