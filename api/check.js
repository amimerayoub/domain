/**
 * /api/check.js
 * Domain + Social Media Availability — namecheckerr.com upstream
 * GET  ?q=mybrand&type=all
 * POST { "q": "mybrand", "type": "domains|social|all", "tlds": "com,io" }
 */

const DOMAIN_TLDS = ['com','net','org','io','co','ai','app','dev','us','cc','me','biz','info','de','at','eu','ru','jp','mobi','in','xyz','uk','ca','ws','ee','do','cn','tech'];
const SOCIAL_PLATFORMS = ['facebook','twitter','youtube','pinterest','vimeo','etsy','github','flickr','reddit','wordpress','soundcloud','500px','behance','tumblr','myspace','meetup','dribbble','aboutme','lastfm','cashapp','venmo','kinja','mix','deviantart','livejournal','ifttt','disqus','twitch','ello','blogger','snapchat'];
const NC_API = 'https://namecheckerr.com/api/check-name';
const NC_KEY = 'arr12';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function socialUrl(platform, u) {
  const map={facebook:`https://facebook.com/${u}`,twitter:`https://twitter.com/${u}`,youtube:`https://youtube.com/@${u}`,pinterest:`https://pinterest.com/${u}`,vimeo:`https://vimeo.com/${u}`,etsy:`https://etsy.com/shop/${u}`,github:`https://github.com/${u}`,flickr:`https://flickr.com/people/${u}`,reddit:`https://reddit.com/user/${u}`,wordpress:`https://${u}.wordpress.com`,soundcloud:`https://soundcloud.com/${u}`,'500px':`https://500px.com/${u}`,behance:`https://behance.net/${u}`,tumblr:`https://${u}.tumblr.com`,myspace:`https://myspace.com/${u}`,meetup:`https://meetup.com/${u}`,dribbble:`https://dribbble.com/${u}`,aboutme:`https://about.me/${u}`,lastfm:`https://last.fm/user/${u}`,cashapp:`https://cash.app/$${u}`,venmo:`https://venmo.com/${u}`,kinja:`https://${u}.kinja.com`,mix:`https://mix.com/${u}`,deviantart:`https://${u}.deviantart.com`,livejournal:`https://${u}.livejournal.com`,ifttt:`https://ifttt.com/p/${u}`,disqus:`https://disqus.com/by/${u}`,twitch:`https://twitch.tv/${u}`,ello:`https://ello.co/${u}`,blogger:`https://${u}.blogspot.com`,snapchat:`https://snapchat.com/add/${u}`};
  return map[platform]||null;
}

function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

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

async function callUpstream(q, keys) {
  const p=new URLSearchParams(); p.append('q',q); keys.forEach(k=>p.append('s[]',k)); p.append('key',NC_KEY);
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
    body: p.toString()
  }, { timeout: 12000, retries: 1 });

  if (!r.ok) throw new Error(`NC ${r.status}`);
  return r.json();
}

function normalise(raw, q) {
  const available=[],unavailable=[],all=[];
  for (const [slug,data] of Object.entries(raw)) {
    const isDomain=DOMAIN_TLDS.includes(slug), isSocial=SOCIAL_PLATFORMS.includes(slug);
    let isAvail=null, profileUrl=null;
    if (typeof data==='boolean') isAvail=data;
    else if (data&&typeof data==='object') { isAvail=data.available??data.status??null; profileUrl=data.url||null; }
    if (isSocial) profileUrl=profileUrl||socialUrl(slug,q);
    const e={
      slug, type:isDomain&&!isSocial?'domain':'social',
      name:isDomain&&!isSocial?`.${slug}`:cap(slug),
      full:isDomain&&!isSocial?`${q}.${slug}`:`${slug}.com/${q}`,
      available:isAvail, status:isAvail===true?'available':isAvail===false?'taken':'unknown',
      profile_url:profileUrl,
      register_url:isDomain&&!isSocial&&isAvail===true?`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(`${q}.${slug}`)}`  :null,
    };
    all.push(e);
    if (isAvail===true) available.push(e); else if (isAvail===false) unavailable.push(e);
  }
  return {available,unavailable,unknown:all.filter(x=>x.available===null),all};
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method==='OPTIONS') return res.status(204).end();
  
  let q, type, customTlds, debug = false;
  if (req.method==='GET') {
    q = req.query.q || '';
    type = req.query.type || 'all';
    customTlds = req.query.tlds || '';
    debug = req.query.debug === '1' || req.query.debug === 'true';
  } else if (req.method==='POST') {
    const b = req.body || {};
    q = b.q || '';
    type = b.type || 'all';
    customTlds = b.tlds || '';
    debug = b.debug === '1' || b.debug === 'true';
  } else {
    return res.status(405).json({success:false,error:'Method not allowed'});
  }
  
  q = q.trim().toLowerCase().replace(/[^a-z0-9\-]/g,'');
  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Provide a brand name ≥2 chars.',
      usage: 'GET /api/check?q=mybrand&type=all'
    });
  }
  
  const tlds = customTlds ? customTlds.split(',').map(t=>t.trim().replace(/^\./,'')) : DOMAIN_TLDS;
  const socials = SOCIAL_PLATFORMS;
  const t0 = Date.now();
  
  const promises = [];
  const timings = {};

  if (type === 'all' || type === 'domains') {
    const tStart = Date.now();
    promises.push(
      callUpstream(q, tlds)
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
        unavailable: unavailable.filter(x => x.type === 'domain').length
      },
      social: {
        total: all.filter(x => x.type === 'social').length,
        available: available.filter(x => x.type === 'social').length,
        unavailable: unavailable.filter(x => x.type === 'social').length
      }
    },
    results: { available, unavailable, unknown, all },
    modules: { brand: errs.length ? 'unavailable' : 'ok' },
    errors: errs.length ? errs : undefined
  };

  if (debug) {
    payload._debug = {
      elapsed_ms: Date.now() - t0,
      modules: timings
    };
  }

  return res.status(200).json(payload);
}
