/**
 * /api/check.js
 * Domain + Social Media Availability — Dual-Check Engine
 * Primary:  Verisign sugapi (com/net/org/vip)
 * RDAP:     RDAP/DNS for known TLDs (io, co, ai, app, dev, xyz, me, tech…)
 * Fallback: BulkSearch API (api.bulksearch.domains) for exotic TLDs
 *
 * GET  ?q=mybrand&type=all
 * POST { "q": "mybrand", "type": "domains|social|all", "tlds": "com,io" }
 */

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DOMAIN_TLDS = ['com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'us', 'cc', 'me', 'biz', 'info', 'de', 'at', 'eu', 'ru', 'jp', 'mobi', 'in', 'xyz', 'uk', 'ca', 'ws', 'ee', 'do', 'cn', 'tech'];
const SOCIAL_PLATFORMS = ['facebook', 'twitter', 'youtube', 'pinterest', 'vimeo', 'etsy', 'github', 'flickr', 'reddit', 'wordpress', 'soundcloud', '500px', 'behance', 'tumblr', 'myspace', 'meetup', 'dribbble', 'aboutme', 'lastfm', 'cashapp', 'venmo', 'kinja', 'mix', 'deviantart', 'livejournal', 'ifttt', 'disqus', 'twitch', 'ello', 'blogger', 'snapchat'];
const NC_API = 'https://namecheckerr.com/api/check-name';
const NC_KEY = 'arr12';

// TLDs supported by Verisign bulk-check
const VERISIGN_TLDS = new Set(['com', 'net', 'org', 'vip']);

// Extended set of TLDs that work reliably via RDAP
const PRIMARY_API_TLDS = new Set([
  "com",
  "net",
  "org",
  "info",
  "biz",
  "uk",
  "co.uk",
  "org.uk",
  "me.uk",
  "net.uk",
  "app",
  "dev",
  "tech",
  "cloud",
  "digital",
  "systems",
  "network",
  "software",
  "bot",
  "data",
  "inc",
  "llc",
  "ltd",
  "company",
  "group",
  "business",
  "enterprises",
  "finance",
  "financial",
  "capital",
  "money",
  "bank",
  "credit",
  "investments",
  "legal",
  "law",
  "lawyer",
  "tax",
  "expert",
  "services",
  "solutions",
  "shop",
  "store",
  "market",
  "marketing",
  "online",
  "xyz",
  "site",
  "website",
  "sale",
  "deals",
  "blog",
  "media",
  "design",
  "studio",
  "video",
  "audio",
  "news",
  "today",
  "press",
  "art",
  "photo",
  "photos",
  "photography",
  "club",
  "space",
  "live",
  "life",
  "community",
  "world",
  "global",
  "zone",
  "link",
  "click",
  "download",
  "help",
  "support",
  "health",
  "healthcare",
  "education",
  "academy",
  "fitness",
  "beauty",
  "fashion",
  "style",
  "cafe",
  "restaurant",
  "travel",
  "hotels",
  "nyc",
  "london",
  "paris",
  "berlin",
  "agency",
  "center",
  "city",
  "email",
  "fund",
  "vip",
  "plus",
]);

const VERISIGN_API = 'https://sugapi.verisign-grs.com/ns-api/2.0/bulk-check';
const BULKSEARCH_API = 'https://api.bulksearch.domains/exists';

const RDAP_SERVERS = {
  com: 'https://rdap.verisign.com/com/v1',
  net: 'https://rdap.verisign.com/net/v1',
  org: 'https://rdap.publicinterestregistry.org/rdap',
  io: 'https://rdap.nic.io',
  co: 'https://rdap.nic.co',
  ai: 'https://rdap.nic.ai',
  app: 'https://rdap.nic.google',
  dev: 'https://rdap.nic.google',
  info: 'https://rdap.afilias.net/rdap/info',
  biz: 'https://rdap.nic.biz',
  us: 'https://rdap.nic.us',
  me: 'https://rdap.nic.me',
  xyz: 'https://rdap.nic.xyz',
  tech: 'https://rdap.nic.tech',
  uk: 'https://rdap.nominet.uk',
  de: 'https://rdap.denic.de',
};
const RDAP_BOOTSTRAP = 'https://rdap.org/domain';
const DOH_URL = 'https://cloudflare-dns.com/dns-query';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function socialUrl(platform, u) {
  const map = {
    facebook: `https://facebook.com/${u}`, twitter: `https://twitter.com/${u}`,
    youtube: `https://youtube.com/@${u}`, pinterest: `https://pinterest.com/${u}`,
    vimeo: `https://vimeo.com/${u}`, etsy: `https://etsy.com/shop/${u}`,
    github: `https://github.com/${u}`, flickr: `https://flickr.com/people/${u}`,
    reddit: `https://reddit.com/user/${u}`, wordpress: `https://${u}.wordpress.com`,
    soundcloud: `https://soundcloud.com/${u}`, '500px': `https://500px.com/${u}`,
    behance: `https://behance.net/${u}`, tumblr: `https://${u}.tumblr.com`,
    myspace: `https://myspace.com/${u}`, meetup: `https://meetup.com/${u}`,
    dribbble: `https://dribbble.com/${u}`, aboutme: `https://about.me/${u}`,
    lastfm: `https://last.fm/user/${u}`, cashapp: `https://cash.app/$${u}`,
    venmo: `https://venmo.com/${u}`, kinja: `https://${u}.kinja.com`,
    mix: `https://mix.com/${u}`, deviantart: `https://${u}.deviantart.com`,
    livejournal: `https://${u}.livejournal.com`, ifttt: `https://ifttt.com/p/${u}`,
    disqus: `https://disqus.com/by/${u}`, twitch: `https://twitch.tv/${u}`,
    ello: `https://ello.co/${u}`, blogger: `https://${u}.blogspot.com`,
    snapchat: `https://snapchat.com/add/${u}`,
  };
  return map[platform] || null;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
// ENGINE 1 — VERISIGN
// ═══════════════════════════════════════════════════════════════

async function verisignBulk(names, tlds) {
  const params = new URLSearchParams({ names: names.join(','), tlds: tlds.join(','), 'include-registered': 'true' });
  const res = await safeFetch(`${VERISIGN_API}?${params}`, {
    headers: {
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Origin': 'https://dnhub.io',
      'Referer': 'https://dnhub.io/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36',
    }
  }, { timeout: 8000, retries: 1 });
  if (!res.ok) throw new Error(`Verisign ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// ENGINE 2 — RDAP + DNS
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
  } catch (_) { }

  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=NS`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && j.Answer && j.Answer.length > 0) return 'taken';
    }
  } catch (_) { }

  try {
    const r = await safeFetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { Accept: 'application/dns-json' }
    }, { timeout: 3000, retries: 1 });
    if (r.ok) {
      const j = await r.json();
      if (j.Status === 0 && j.Answer && j.Answer.length > 0) return 'taken';
    }
  } catch (_) { }

  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// ENGINE 3 — BULKSEARCH FALLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Checks a list of full domain names via BulkSearch API.
 * Returns: { "example.tv": true/false }   (true = domain exists/taken)
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
  return res.json();
}

function normalizeBulkSearch(domains, response) {
  if (!response || !Array.isArray(response.results)) {
    throw new Error("Invalid BulkSearch response");
  }
  if (domains.length !== response.results.length) {
    console.warn("BulkSearch length mismatch");
  }
  const limit = Math.min(domains.length, response.results.length);
  const mapped = [];
  for (let i = 0; i < limit; i++) {
    const val = response.results[i];
    let available;
    if (val === 1) available = true;
    else if (val === 0) available = false;
    else available = null; // Error/Unknown
    mapped.push({
      domain: domains[i],
      available,
      source: "bulksearch"
    });
  }
  return mapped;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN AVAILABILITY CHECKER (routes to correct engine)
// ═══════════════════════════════════════════════════════════════

async function checkDomainsAvailability(q, tlds) {
  const results = {};

  // Partition TLDs by engine
  const verisignTlds = tlds.filter(t => VERISIGN_TLDS.has(t));
  const rdapOnlyTlds = tlds.filter(t => !VERISIGN_TLDS.has(t) && PRIMARY_API_TLDS.has(t));
  const bulksearchTlds = tlds.filter(t => !PRIMARY_API_TLDS.has(t));

  const failedVerisignTlds = new Set(verisignTlds);

  // 1. Verisign
  if (verisignTlds.length > 0) {
    try {
      const data = await verisignBulk([q], verisignTlds);
      if (data && Array.isArray(data.results)) {
        for (const item of data.results) {
          const tld = item.name.split('.').pop().toLowerCase();
          failedVerisignTlds.delete(tld);
          const isAvail = item.availability === 'available';
          results[tld] = { available: isAvail, status: isAvail ? 'available' : 'taken', engine: 'verisign', source: 'verisign' };
        }
      }
    } catch (_) { /* keep failedVerisignTlds set to trigger RDAP fallback */ }
  }

  // 2. RDAP for known TLDs + failed Verisign
  const rdapTlds = [...new Set([...rdapOnlyTlds, ...failedVerisignTlds])];
  if (rdapTlds.length > 0) {
    await Promise.allSettled(rdapTlds.map(async tld => {
      const domain = `${q}.${tld}`;
      const status = await rdapAvailabilityCheck(domain, tld);
      if (status === 'available') results[tld] = { available: true, status: 'available', engine: 'rdap', source: 'rdap' };
      else if (status === 'taken') results[tld] = { available: false, status: 'taken', engine: 'rdap', source: 'rdap' };
      else results[tld] = { available: null, status: 'unknown', engine: 'rdap', source: 'rdap' };
    }));
  }

  // 3. BulkSearch for exotic/unsupported TLDs
  if (bulksearchTlds.length > 0) {
    const domains = bulksearchTlds.map(t => `${q}.${t}`);
    try {
      const tStart = Date.now();
      const rawResponse = await bulkSearchCheck(domains);
      const elapsed = Date.now() - tStart;

      const normalized = normalizeBulkSearch(domains, rawResponse);
      const availableCount = normalized.filter(d => d.available === true).length;
      const registeredCount = normalized.filter(d => d.available === false).length;
      console.log(`BulkSearch Lookup: domains count: ${domains.length}, results count: ${rawResponse?.results?.length || 0}, response time: ${elapsed}ms, available count: ${availableCount}, registered count: ${registeredCount}`);

      for (const item of normalized) {
        const tld = item.domain.split('.').pop().toLowerCase();
        let status;
        if (item.available === true) status = 'available';
        else if (item.available === false) status = 'taken';
        else status = 'unknown';

        results[tld] = {
          available: item.available,
          status,
          engine: 'bulksearch',
          source: item.source
        };
      }
      // If there are bulksearchTlds that were NOT mapped due to minimum length, we mark them as unknown
      for (const tld of bulksearchTlds) {
        if (!results[tld]) {
          results[tld] = { available: null, status: 'unknown', engine: 'bulksearch', source: 'bulksearch' };
        }
      }
    } catch (err) {
      console.error(`BulkSearch failed: ${err.message}`);
      // BulkSearch failed — mark as unknown (never show a failed state)
      for (const tld of bulksearchTlds) {
        results[tld] = { available: null, status: 'unknown', engine: 'bulksearch', source: 'bulksearch' };
      }
    }
  }

  // 4. Ensure all TLDs have a result
  for (const tld of tlds) {
    if (!results[tld]) results[tld] = { available: null, status: 'unknown', engine: 'none' };
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL CHECK (namecheckerr)
// ═══════════════════════════════════════════════════════════════

async function callUpstream(q, keys) {
  const p = new URLSearchParams();
  p.append('q', q);
  keys.forEach(k => p.append('s[]', k));
  p.append('key', NC_KEY);
  const r = await safeFetch(NC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'Origin': 'https://namecheckerr.com',
      'Referer': 'https://namecheckerr.com/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/147.0.0.0 Safari/537.36'
    },
    body: p.toString(),
  }, { timeout: 12000, retries: 1 });

  if (!r.ok) throw new Error(`NC ${r.status}`);
  return r.json();
}

function normalise(raw, q) {
  const available = [], unavailable = [], all = [];
  for (const [slug, data] of Object.entries(raw)) {
    const isDomain = DOMAIN_TLDS.includes(slug);
    const isSocial = SOCIAL_PLATFORMS.includes(slug);
    let isAvail = null, profileUrl = null;
    if (typeof data === 'boolean') isAvail = data;
    else if (data && typeof data === 'object') { isAvail = data.available ?? data.status ?? null; profileUrl = data.url || null; }
    if (isSocial) profileUrl = profileUrl || socialUrl(slug, q);

    let source = 'unknown';
    if (isSocial) {
      source = 'namecheckerr';
    } else if (isDomain) {
      source = (data && data.source) || (data && data.engine) || (VERISIGN_TLDS.has(slug) ? 'verisign' : PRIMARY_API_TLDS.has(slug) ? 'rdap' : 'bulksearch');
    }

    const e = {
      slug, type: isDomain && !isSocial ? 'domain' : 'social',
      name: isDomain && !isSocial ? `.${slug}` : cap(slug),
      full: isDomain && !isSocial ? `${q}.${slug}` : `${slug}.com/${q}`,
      domain: isDomain && !isSocial ? `${q}.${slug}` : `${slug}.com/${q}`,
      available: isAvail,
      status: isAvail === true ? 'available' : isAvail === false ? 'taken' : 'unknown',
      source,
      profile_url: profileUrl,
      register_url: isDomain && !isSocial && isAvail === true
        ? `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(`${q}.${slug}`)}`
        : null,
    };
    all.push(e);
    if (isAvail === true) available.push(e); else if (isAvail === false) unavailable.push(e);
  }
  return { available, unavailable, unknown: all.filter(x => x.available === null), all };
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  let q, type, customTlds, debug = false;
  if (req.method === 'GET') {
    q = req.query.q || '';
    type = req.query.type || 'all';
    customTlds = req.query.tlds || '';
    debug = req.query.debug === '1' || req.query.debug === 'true';
  } else if (req.method === 'POST') {
    const b = req.body || {};
    q = b.q || '';
    type = b.type || 'all';
    customTlds = b.tlds || '';
    debug = b.debug === '1' || b.debug === 'true';
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  q = q.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Provide a brand name ≥2 chars.',
      usage: 'GET /api/check?q=mybrand&type=all',
    });
  }

  const tlds = customTlds ? customTlds.split(',').map(t => t.trim().replace(/^\./, '')) : DOMAIN_TLDS;
  const socials = SOCIAL_PLATFORMS;
  const t0 = Date.now();
  const promises = [];
  const timings = {};

  if (type === 'all' || type === 'domains') {
    const tStart = Date.now();
    promises.push(
      checkDomainsAvailability(q, tlds)
        .then(r => {
          timings.domains = { ok: true, elapsed_ms: Date.now() - tStart };
          return { _t: 'domains', ...r };
        })
        .catch(err => {
          timings.domains = { ok: false, elapsed_ms: Date.now() - tStart, error: err.message };
          const e = new Error(err.message || String(err));
          e.type = 'domains';
          throw e;
        })
    );
  }

  if (type === 'all' || type === 'social') {
    const tStart = Date.now();
    promises.push(
      callUpstream(q, socials)
        .then(r => {
          timings.social = { ok: true, elapsed_ms: Date.now() - tStart };
          return { _t: 'social', ...r };
        })
        .catch(err => {
          timings.social = { ok: false, elapsed_ms: Date.now() - tStart, error: err.message };
          const e = new Error(err.message || String(err));
          e.type = 'social';
          throw e;
        })
    );
  }

  const settled = await Promise.allSettled(promises);
  let raw = {}, errs = [];

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const { _t, ...d } = r.value;
      raw = { ...raw, ...d };
    } else {
      const errMsg = r.reason?.message || 'error';
      errs.push(errMsg);
      const failedType = r.reason?.type;
      const keysToFallback = failedType === 'domains' ? tlds : (failedType === 'social' ? socials : []);
      for (const k of keysToFallback) {
        raw[k] = { available: null, status: 'unknown', provider: 'unavailable', error: errMsg };
      }
    }
  }

  const { available, unavailable, unknown, all } = normalise(raw, q);

  const payload = {
    success: true,
    query: q,
    type,
    checked_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
    summary: {
      total: all.length,
      available: available.length,
      unavailable: unavailable.length,
      unknown: unknown.length,
      domains: {
        total: all.filter(x => x.type === 'domain').length,
        available: available.filter(x => x.type === 'domain').length,
        unavailable: unavailable.filter(x => x.type === 'domain').length,
      },
      social: {
        total: all.filter(x => x.type === 'social').length,
        available: available.filter(x => x.type === 'social').length,
        unavailable: unavailable.filter(x => x.type === 'social').length,
      },
    },
    results: { available, unavailable, unknown, all },
    modules: { brand: errs.length ? 'unavailable' : 'ok' },
    errors: errs.length ? errs : undefined,
  };

  if (debug) {
    payload._debug = {
      elapsed_ms: Date.now() - t0,
      modules: timings,
      engines: {
        verisign_tlds: [...VERISIGN_TLDS],
        primary_api_tlds: [...PRIMARY_API_TLDS],
        bulksearch_api: BULKSEARCH_API,
      },
    };
  }

  return res.status(200).json(payload);
}
