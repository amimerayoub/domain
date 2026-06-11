/**
 * /api/bulk-check.js
 * Bulk Domain Availability — Dual-Check Engine
 * Primary:  Verisign sugapi (for supported TLDs)
 * RDAP:     RDAP/DNS fallback for known TLDs not on Verisign
 * Fallback: BulkSearch API (api.bulksearch.domains) for unsupported/exotic TLDs
 *
 * GET  ?names=Zynora,Veltrix&tlds=com,io
 * POST { "names": [...], "tlds": [...] }
 */

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VERISIGN_API    = 'https://sugapi.verisign-grs.com/ns-api/2.0/bulk-check';
const BULKSEARCH_API  = 'https://api.bulksearch.domains/exists';
const MAX_TLDS        = 10;
const BATCH_SIZE      = 100;

// TLDs supported by Verisign bulk-check
const VERISIGN_TLDS = new Set(['com', 'net', 'org', 'vip']);

// Extended list of TLDs that work reliably via RDAP (no need for BulkSearch)
const PRIMARY_API_TLDS = new Set([
  'com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev',
  'xyz', 'me', 'live', 'tech', 'shop', 'store', 'online',
  'site', 'cloud', 'info', 'biz', 'us', 'uk', 'de',
  'vip', 'cc', 'at', 'eu', 'ru', 'jp', 'in', 'mobi', 'do', 'cn', 'ee',
]);

const RDAP_SERVERS = {
  com: 'https://rdap.verisign.com/com/v1',
  net: 'https://rdap.verisign.com/net/v1',
  org: 'https://rdap.publicinterestregistry.org/rdap',
  io:  'https://rdap.nic.io',
  co:  'https://rdap.nic.co',
  ai:  'https://rdap.nic.ai',
  app: 'https://rdap.nic.google',
  dev: 'https://rdap.nic.google',
  info:'https://rdap.afilias.net/rdap/info',
  biz: 'https://rdap.nic.biz',
  us:  'https://rdap.nic.us',
  me:  'https://rdap.nic.me',
  xyz: 'https://rdap.nic.xyz',
  tech:'https://rdap.nic.tech',
  uk:  'https://rdap.nominet.uk',
  de:  'https://rdap.denic.de',
};
const RDAP_BOOTSTRAP = 'https://rdap.org/domain';
const DOH_URL        = 'https://cloudflare-dns.com/dns-query';

// ── In-memory cache (TTL 24h per domain result) ────────────────
const _cache = new Map(); // key: "domain.tld" => { result, ts }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ── Analytics counters ─────────────────────────────────────────
const _analytics = {
  verisign_hits: 0, verisign_misses: 0,
  rdap_hits: 0,     rdap_misses: 0,
  bulksearch_hits: 0, bulksearch_misses: 0,
  cache_hits: 0,
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function cleanName(s) { return s.trim().replace(/\..*$/, '').replace(/[^a-zA-Z0-9\-]/g, ''); }
function cleanTld(s)  { return s.trim().replace(/^\./, '').toLowerCase().replace(/[^a-z0-9\-]/g, ''); }
function chunk(arr, n) { const r = []; for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n)); return r; }

function cacheGet(domain) {
  const entry = _cache.get(domain.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(domain.toLowerCase()); return null; }
  _analytics.cache_hits++;
  return entry.result;
}
function cacheSet(domain, result) {
  _cache.set(domain.toLowerCase(), { result, ts: Date.now() });
}

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

// ═══════════════════════════════════════════════════════════════
// ENGINE 1 — VERISIGN BULK CHECK
// ═══════════════════════════════════════════════════════════════

async function verisignBulk(names, tlds, includeRegistered = true) {
  const params = new URLSearchParams({
    names: names.join(','),
    tlds: tlds.join(','),
    'include-registered': String(includeRegistered),
  });
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

// ═══════════════════════════════════════════════════════════════
// ENGINE 2 — RDAP + DNS FALLBACK
// ═══════════════════════════════════════════════════════════════

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

  // DNS NS lookup via Cloudflare DoH
  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=NS`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && j.Answer && j.Answer.length > 0) return 'taken';
    }
  } catch (_) {}

  // DNS A lookup via Cloudflare DoH
  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && j.Answer && j.Answer.length > 0) return 'taken';
    }
  } catch (_) {}

  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// ENGINE 3 — BULKSEARCH FALLBACK (for exotic/unsupported TLDs)
// ═══════════════════════════════════════════════════════════════

/**
 * POST https://api.bulksearch.domains/exists
 * body: domains=["example.com","example.ai"]
 * Returns: { "example.com": true/false, ... }  (true = exists/taken)
 */
async function bulkSearchCheck(domains) {
  const body = `domains=${encodeURIComponent(JSON.stringify(domains))}`;
  const res = await safeFetch(BULKSEARCH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Accept': 'application/json, */*',
      'Origin': 'https://bulksearch.domains',
      'Referer': 'https://bulksearch.domains/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36',
    },
    body,
  }, { timeout: 12000, retries: 2 });

  if (!res.ok) throw new Error(`BulkSearch ${res.status}`);
  return res.json(); // { "example.com": true, "example.ai": false }
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN BATCH PROCESSOR (core routing logic)
// ═══════════════════════════════════════════════════════════════

async function processDomainBatch(batch, includeRegistered) {
  const resultsMap = {};

  // Split into Primary (Verisign/RDAP) and BulkSearch groups
  const verisignGroup = [];
  const rdapOnlyGroup = [];
  const bulksearchGroup = [];

  for (const item of batch) {
    const cached = cacheGet(item.domain);
    if (cached) {
      resultsMap[item.domain.toLowerCase()] = cached;
      continue;
    }

    if (VERISIGN_TLDS.has(item.tld)) {
      verisignGroup.push(item);
    } else if (PRIMARY_API_TLDS.has(item.tld)) {
      rdapOnlyGroup.push(item);
    } else {
      bulksearchGroup.push(item);
    }
  }

  // ── 1. Verisign bulk check ─────────────────────────────────
  const failedVerisign = [];
  if (verisignGroup.length > 0) {
    const tldGroups = {};
    for (const item of verisignGroup) {
      if (!tldGroups[item.tld]) tldGroups[item.tld] = [];
      tldGroups[item.tld].push(item.name);
    }

    await Promise.allSettled(Object.entries(tldGroups).map(async ([tld, names]) => {
      try {
        const data = await verisignBulk(names, [tld], includeRegistered);
        if (data && Array.isArray(data.results)) {
          for (const r of data.results) {
            const key = r.name.toLowerCase();
            const result = { name: r.name, availability: r.availability };
            resultsMap[key] = result;
            cacheSet(key, result);
          }
          _analytics.verisign_hits++;
        }
        // Detect missing results → fallback via RDAP
        for (const name of names) {
          const key = `${name}.${tld}`.toLowerCase();
          if (!resultsMap[key]) {
            const item = verisignGroup.find(i => i.name === name && i.tld === tld);
            if (item) failedVerisign.push(item);
          }
        }
      } catch (_) {
        _analytics.verisign_misses++;
        for (const name of names) {
          const item = verisignGroup.find(i => i.name === name && i.tld === tld);
          if (item) failedVerisign.push(item);
        }
      }
    }));
  }

  // ── 2. RDAP/DNS check for known TLDs + failed Verisign ─────
  const rdapDomains = [...rdapOnlyGroup, ...failedVerisign];
  if (rdapDomains.length > 0) {
    await Promise.allSettled(rdapDomains.map(async item => {
      const status = await rdapAvailabilityCheck(item.domain, item.tld);
      const availability = status === 'available' ? 'available' : status === 'taken' ? 'registered' : 'unknown';
      const result = { name: item.domain, availability };
      const key = item.domain.toLowerCase();
      resultsMap[key] = result;
      if (status !== 'unknown') {
        cacheSet(key, result);
        _analytics.rdap_hits++;
      } else {
        _analytics.rdap_misses++;
      }
    }));
  }

  // ── 3. BulkSearch fallback for exotic/unsupported TLDs ─────
  if (bulksearchGroup.length > 0) {
    // Chunk into batches of 100
    const bulkBatches = chunk(bulksearchGroup, BATCH_SIZE);
    await Promise.allSettled(bulkBatches.map(async batchSlice => {
      const domainList = batchSlice.map(i => i.domain);
      try {
        const data = await bulkSearchCheck(domainList);
        for (const item of batchSlice) {
          const key = item.domain.toLowerCase();
          const taken = data[item.domain] ?? data[key];
          let availability;
          if (taken === true)       { availability = 'registered'; _analytics.bulksearch_hits++; }
          else if (taken === false) { availability = 'available';  _analytics.bulksearch_hits++; }
          else                      { availability = 'unknown';    _analytics.bulksearch_misses++; }
          const result = { name: item.domain, availability };
          resultsMap[key] = result;
          if (availability !== 'unknown') cacheSet(key, result);
        }
      } catch (_) {
        // Both primary and BulkSearch failed — mark as unknown
        _analytics.bulksearch_misses++;
        for (const item of batchSlice) {
          const key = item.domain.toLowerCase();
          resultsMap[key] = { name: item.domain, availability: 'unknown' };
        }
      }
    }));
  }

  // ── 4. Fill any gaps ────────────────────────────────────────
  for (const item of batch) {
    const key = item.domain.toLowerCase();
    if (!resultsMap[key]) {
      resultsMap[key] = { name: item.domain, availability: 'unknown' };
    }
  }

  return batch.map(item => resultsMap[item.domain.toLowerCase()]);
}

// ═══════════════════════════════════════════════════════════════
// ENRICHMENT
// ═══════════════════════════════════════════════════════════════

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
      engine: VERISIGN_TLDS.has(tld) ? 'verisign' : PRIMARY_API_TLDS.has(tld) ? 'rdap' : 'bulksearch',
      register_url: ok ? `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(item.name.toLowerCase())}` : null,
      whois_url: `https://lookup.icann.org/en/lookup?name=${encodeURIComponent(item.name.toLowerCase())}`,
    };
    if (ok) available.push(e); else registered.push(e);
    if (!byName[base]) byName[base] = { name: base, results: [] }; byName[base].results.push(e);
    if (!byTld[tld])   byTld[tld]  = { tld,  results: [] };        byTld[tld].results.push(e);
  }
  return { available, registered, byName, byTld };
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  let rawNames, rawTlds, includeRegistered = true, debug = false;
  if (req.method === 'GET') {
    rawNames = (req.query.names || req.query.name || '').split(',').map(s => s.trim()).filter(Boolean);
    rawTlds  = (req.query.tlds  || req.query.tld  || 'com').split(',').map(s => s.trim()).filter(Boolean);
    includeRegistered = req.query['include-registered'] !== 'false';
    debug = req.query.debug === '1' || req.query.debug === 'true';
  } else if (req.method === 'POST') {
    const b  = req.body || {};
    const n  = b.names || b.name || [];
    const t  = b.tlds  || b.tld  || ['com'];
    rawNames = (Array.isArray(n) ? n : String(n).split(',')).map(s => s.trim()).filter(Boolean);
    rawTlds  = (Array.isArray(t) ? t : String(t).split(',')).map(s => s.trim()).filter(Boolean);
    includeRegistered = b['include-registered'] !== false;
    debug = b.debug === '1' || b.debug === 'true';
  } else return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!rawNames.length) return res.status(400).json({ success: false, error: 'No names provided.', usage: 'GET /api/bulk-check?names=Zynora,Veltrix&tlds=com,io' });

  const names  = [...new Set(rawNames.map(cleanName).filter(Boolean))];
  const tlds   = [...new Set(rawTlds.map(cleanTld).filter(Boolean))].slice(0, MAX_TLDS);
  if (!names.length) return res.status(400).json({ success: false, error: 'All names were invalid.' });

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

  // Chunk into batches of BATCH_SIZE
  const domainBatches = chunk(requestedDomains, BATCH_SIZE);

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

  const orderedBatches = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      orderedBatches.push(r.value);
      timings.batches.push({
        id: r.value.index + 1,
        size: r.value.results.length,
        elapsed_ms: r.value.elapsed_ms,
        ok: r.value.ok,
        ...(r.value.error ? { error: r.value.error } : {}),
      });
    } else {
      errors.push(`Promise rejected: ${r.reason?.message || 'Unknown error'}`);
    }
  }

  orderedBatches.sort((a, b) => a.index - b.index);
  for (const b of orderedBatches) allResults.push(...b.results);

  if (!allResults.length && errors.length) return res.status(502).json({ success: false, error: 'Upstream failed.', details: errors });

  const { available, registered, byName, byTld } = enrich(allResults);

  const payload = {
    success: true, checked_at: new Date().toISOString(), elapsed_ms: Date.now() - t0,
    input: { names, tlds, total_checked: allResults.length },
    summary: {
      total: allResults.length, available: available.length, registered: registered.length,
      availability_rate: `${allResults.length ? Math.round(available.length / allResults.length * 100) : 0}%`,
    },
    results: {
      available,
      registered,
      all: allResults.map(r => ({
        domain: r.name.toLowerCase(),
        availability: r.availability,
        available: r.availability === 'available',
      })),
    },
    by_name: Object.values(byName),
    by_tld:  Object.values(byTld),
    errors:  errors.length ? errors : undefined,
  };

  if (debug) {
    payload._debug = {
      elapsed_ms: Date.now() - t0,
      batches: timings.batches,
      analytics: { ..._analytics },
      engines: {
        primary_tlds: [...PRIMARY_API_TLDS],
        verisign_tlds: [...VERISIGN_TLDS],
        bulksearch_api: BULKSEARCH_API,
      },
    };
  }

  return res.status(200).json(payload);
}
