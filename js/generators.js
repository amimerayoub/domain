// generators.js — All domain generation logic
import { cap, pick, rand, extractKeywords } from './utils.js';
import { getData } from './dataLoader.js';
import { makeDomain, scoreAndLimit } from './scoring.js';

// State
export const genState = {
  selectedConsonants: 'bcdfghjklmnpqrstvwxyz'.split(''),
  selectedVowels: 'aeiou'.split('')
};

// Internal generator helpers
function generateFallbackDomains(keyword, limit) {
  const kw = cap(keyword || 'domain');
  const fallbacks = [kw + 'Pro', kw + 'Hub', kw + 'Group', 'Best' + kw, kw + 'HQ', 'Top' + kw, 'My' + kw, kw + 'Labs', kw + 'Tech', kw + 'Now'];
  return fallbacks.slice(0, limit).map(n => makeDomain(n, keyword));
}

// === GEO ===
export function generateGeo({ keyword, custom, locationType, sortBy, limit, smartMode }) {
  try {
    if (!keyword && !custom) return generateFallbackDomains('geo', limit);
    const niche = keyword || 'service';
    const data = getData(smartMode);
    let locations = [];

    if (custom) {
      locations = [{ name: cap(custom.replace(/[\s,]+/g, '')), pop: rand(200000, 3000000) }];
    } else if (data.GEO_DOMAINS_DATA && data.GEO_DOMAINS_DATA[locationType]) {
      locations = Object.entries(data.GEO_DOMAINS_DATA[locationType])
        .map(([n, p]) => ({ name: cap(n.replace(/[\s-]+/g, '')), pop: p }));
    }

    // Sort
    if (sortBy === 'population') locations.sort((a, b) => b.pop - a.pop);
    else if (sortBy === 'shortest') locations.sort((a, b) => a.name.length - b.name.length);
    else locations.sort((a, b) => b.pop - a.pop); // default by population

    locations = locations.slice(0, 20);
    const domains = [];

    locations.forEach(loc => {
      const combos = [
        loc.name + cap(niche), cap(niche) + loc.name,
        'Best' + loc.name + cap(niche), 'Top' + loc.name + cap(niche),
        loc.name + cap(niche) + 'Pro', loc.name + cap(niche) + 'HQ'
      ];
      if (smartMode) {
        combos.push(loc.name + cap(niche) + 'Experts', 'My' + loc.name + cap(niche), 'Go' + loc.name + cap(niche));
      }
      combos.forEach(c => { const d = makeDomain(c, niche); if (d) domains.push(d); });
    });

    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateGeo error:', e);
    return generateFallbackDomains(keyword || 'geo', limit);
  }
}

// === KEYWORD ===
export function generateKeyword({ keywords, category, usePrefix, useSuffix, useCategoryKws, useCombine, limit, smartMode }) {
  try {
    if (!keywords || !keywords.length) return generateFallbackDomains('keyword', limit);
    const data = getData(smartMode);
    const domains = [];
    const seen = new Set();

    // Helper: add domain only if unique
    function addUnique(name, seed) {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const d = makeDomain(name, seed);
      if (d) domains.push(d);
    }

    // Find matching category — fuzzy match against data.json emoji-prefixed keys
    let catKws = [];
    if (useCategoryKws && data.KEYWORD_CATEGORIES && category && category !== 'all') {
      // Direct match first
      if (data.KEYWORD_CATEGORIES[category]) {
        catKws = data.KEYWORD_CATEGORIES[category];
      } else {
        // Fuzzy: find key that contains the category string (ignoring emojis)
        const catLower = category.toLowerCase().replace(/[^\w\s&]/g, '').trim();
        for (const key of Object.keys(data.KEYWORD_CATEGORIES)) {
          const keyClean = key.toLowerCase().replace(/[^\w\s&]/g, '').trim();
          if (keyClean.includes(catLower) || catLower.includes(keyClean)) {
            catKws = data.KEYWORD_CATEGORIES[key];
            break;
          }
        }
      }
    }

    // Pick random items from an array
    function pickN(arr, n) {
      if (!arr || !arr.length) return [];
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    }

    // Get smarter prefix/suffix pools — filter by length for better domain names
    const rawPrefixes = data.BRANDABLE_PREFIX || [];
    const rawSuffixes = data.BRANDABLE_SUFFIX || [];
    const shortPrefixes = rawPrefixes.filter(p => p.length >= 2 && p.length <= 6);
    const longPrefixes = rawPrefixes.filter(p => p.length >= 4 && p.length <= 10);
    const shortSuffixes = rawSuffixes.filter(s => s.length >= 2 && s.length <= 6);
    const longSuffixes = rawSuffixes.filter(s => s.length >= 4 && s.length <= 10);

    // How many prefix/suffix to sample
    const prefixCount = smartMode ? 25 : 12;
    const suffixCount = smartMode ? 25 : 12;
    const prefixes = pickN(shortPrefixes.length > 0 ? shortPrefixes : rawPrefixes, prefixCount);
    const suffixes = pickN(shortSuffixes.length > 0 ? shortSuffixes : rawSuffixes, suffixCount);

    // Merge user keywords with category keywords
    const allKw = [...keywords];
    const catSample = pickN(catKws, smartMode ? 12 : 6);
    if (catSample.length) allKw.push(...catSample);

    // Generate combinations
    allKw.forEach(kw => {
      // Prefix + keyword
      if (usePrefix) {
        prefixes.forEach(p => addUnique(cap(p) + cap(kw), kw));
        // Also try category words as prefixes
        pickN(catKws, 5).forEach(c => addUnique(cap(c) + cap(kw), kw));
      }
      // Keyword + suffix
      if (useSuffix) {
        suffixes.forEach(s => addUnique(cap(kw) + cap(s), kw));
        // Also try category words as suffixes
        pickN(catKws, 5).forEach(c => addUnique(cap(kw) + cap(c), kw));
      }
      // Keyword + keyword (cross-combine)
      if (useCombine && keywords.length > 1) {
        keywords.forEach(kw2 => {
          if (kw !== kw2) {
            addUnique(cap(kw) + cap(kw2), kw);
            addUnique(cap(kw2) + cap(kw), kw);
          }
        });
      }
    });

    // Smart mode: bonus combos from long prefixes/suffixes
    if (smartMode) {
      const longP = pickN(longPrefixes, 10);
      const longS = pickN(longSuffixes, 10);
      keywords.forEach(kw => {
        longP.forEach(p => addUnique(cap(p) + cap(kw), kw));
        longS.forEach(s => addUnique(cap(kw) + cap(s), kw));
      });
      // Cross-category combos
      if (catKws.length) {
        const catA = pickN(catKws, 8);
        const catB = pickN(catKws, 8);
        catA.forEach(a => catB.forEach(b => {
          if (a !== b && (a + b).length <= 18) addUnique(cap(a) + cap(b), a);
        }));
      }
    }

    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateKeyword error:', e);
    return generateFallbackDomains('keyword', limit);
  }
}

// === PATTERN ENGINE ===
// Supported tokens:
//   C  = random consonant (from selectedConsonants)
//   V  = random vowel     (from selectedVowels)
//   L  = any letter (a-z)
//   N  = any digit  (0-9)
//   P  = Chinese-premium consonant (no A,E,I,O,U,V)
//   W  = Western-premium letter    (no J,K,Q,U,V,W,X,Y,Z)
//   -  = literal hyphen
//   *  = any letter OR digit OR hyphen
//   ^  = starts-with mode (prefix) — special, handled before expansion
//   A,B,H,K = random letter (same value reused for that placeholder key)
//   D,E,F,G = random digit  (same value reused for that placeholder key)
//   M,O     = random vowel  (same value reused for that placeholder key)
//   U,X     = random consonant (same value reused for that placeholder key)
//   lowercase letter / digit = literal fixed character

const CONS_ALL  = 'bcdfghjklmnpqrstvwxyz'.split('');
const VOWELS_ALL = 'aeiou'.split('');
const PREM_CN   = CONS_ALL.filter(c => !'aeiouv'.includes(c));    // Chinese premium
const PREM_W    = 'abcdefghilmnoprstyz'.split('');                 // Western premium (no JKQUVWXYZ)
const DIGITS    = '0123456789'.split('');
const LETTERS   = 'abcdefghijklmnopqrstuvwxyz'.split('');
const ALPHANUM  = [...LETTERS, ...DIGITS, '-'];
// Placeholder token sets
const PLACEHOLDER_LETTER = new Set(['A','B','H','K']);
const PLACEHOLDER_DIGIT  = new Set(['D','E','F','G']);
const PLACEHOLDER_VOWEL  = new Set(['M','O']);
const PLACEHOLDER_CONS   = new Set(['U','X']);
// Tokens that need a random pick (not wildcards)
const WILDCARD_TOKENS = new Set(['C','V','L','N','P','W','*','-',
  'A','B','H','K','D','E','F','G','M','O','U','X']);

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function expandPattern(rawPattern, cons, vowels) {
  // Handle ^ prefix: remove it, note it's a "starts-with" marker (ignored in generation itself)
  let pat = rawPattern.replace(/^\^/, '');

  // Build a resolved name from the token sequence
  // Placeholder values are memoized per-call
  const memo = {};

  let name = '';
  let i = 0;
  while (i < pat.length) {
    const ch = pat[i];

    // Uppercase tokens
    if (ch === 'C') { name += pickFrom(cons.length ? cons : CONS_ALL); i++; continue; }
    if (ch === 'V') { name += pickFrom(vowels.length ? vowels : VOWELS_ALL); i++; continue; }
    if (ch === 'L') { name += pickFrom(LETTERS); i++; continue; }
    if (ch === 'N') { name += pickFrom(DIGITS); i++; continue; }
    if (ch === 'P') { name += pickFrom(PREM_CN); i++; continue; }
    if (ch === 'W') { name += pickFrom(PREM_W); i++; continue; }
    if (ch === '-') { name += '-'; i++; continue; }
    if (ch === '*') { name += pickFrom(ALPHANUM); i++; continue; }

    // Repetition placeholder — letter
    if (PLACEHOLDER_LETTER.has(ch)) {
      if (!memo[ch]) memo[ch] = pickFrom(LETTERS);
      name += memo[ch]; i++; continue;
    }
    // Repetition placeholder — digit
    if (PLACEHOLDER_DIGIT.has(ch)) {
      if (!memo[ch]) memo[ch] = pickFrom(DIGITS);
      name += memo[ch]; i++; continue;
    }
    // Repetition placeholder — vowel
    if (PLACEHOLDER_VOWEL.has(ch)) {
      if (!memo[ch]) memo[ch] = pickFrom(vowels.length ? vowels : VOWELS_ALL);
      name += memo[ch]; i++; continue;
    }
    // Repetition placeholder — consonant
    if (PLACEHOLDER_CONS.has(ch)) {
      if (!memo[ch]) memo[ch] = pickFrom(cons.length ? cons : CONS_ALL);
      name += memo[ch]; i++; continue;
    }

    // Lowercase letter or digit → literal
    if (/[a-z0-9]/.test(ch)) { name += ch; i++; continue; }

    // Unknown character — skip
    i++;
  }
  return name;
}

export function generatePattern({ pattern, patterns, tld, limit, smartMode }) {
  try {
    const cons = genState.selectedConsonants.length ? genState.selectedConsonants : CONS_ALL;
    const vowels = genState.selectedVowels.length ? genState.selectedVowels : VOWELS_ALL;

    // Support single pattern OR array of patterns
    const patternList = patterns && patterns.length
      ? patterns.filter(p => p && p.trim())
      : pattern ? [pattern.trim()] : ['CVCV'];

    if (!patternList.length) return generateFallbackDomains('pattern', limit);

    const domains = [];
    const seen = new Set();
    const perPattern = Math.ceil(limit / patternList.length);
    const maxAttempts = Math.max(500, limit * 8);

    for (const pat of patternList) {
      let attempts = 0;
      let generated = 0;
      while (generated < perPattern && attempts < maxAttempts) {
        attempts++;
        const name = expandPattern(pat, cons, vowels);
        if (!name || name.length < 2 || seen.has(name)) continue;
        seen.add(name);
        const fullName = name + (tld || '.com');
        domains.push({ name: fullName, available: 'checking', pattern: pat });
        generated++;
      }
    }

    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generatePattern error:', e);
    return generateFallbackDomains('pattern', limit);
  }
}

// Validate a pattern string — returns { valid: bool, error: string }
export function validatePattern(pat) {
  if (!pat || !pat.trim()) return { valid: false, error: 'Pattern cannot be empty' };
  const clean = pat.replace(/^\^/, '');
  if (clean.length === 0) return { valid: false, error: 'Pattern cannot be only ^' };
  // All chars must be valid tokens
  const validChars = /^[CVLNPWABHKDEFGMOUXaeiou0-9bcdfghjklmnpqrstvwxyz\-*]+$/;
  if (!validChars.test(clean)) {
    const bad = [...clean].find(c => !/[CVLNPWABHKDEFGMOUXaeiou0-9bcdfghjklmnpqrstvwxyz\-*]/.test(c));
    return { valid: false, error: `Unknown token "${bad}" — use C,V,L,N,P,W,*,- or a lowercase letter/digit` };
  }
  if (clean.length > 20) return { valid: false, error: 'Pattern too long (max 20 chars)' };
  return { valid: true, error: '' };
}

// Generate quick preview examples for a given pattern (no TLD)
export function previewPattern(pat, count = 5) {
  const cons = CONS_ALL;
  const vowels = VOWELS_ALL;
  const examples = [];
  const seen = new Set();
  let attempts = 0;
  while (examples.length < count && attempts < 200) {
    attempts++;
    const name = expandPattern(pat, cons, vowels);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    examples.push(name);
  }
  return examples;
}

// === BRANDABLE ===
export function generateBrandable({ base, maxLen, usePrefix, useSuffix, useBoth, useRandom, limit, smartMode }) {
  try {
    const data = getData(smartMode);
    const prefixes = data.BRANDABLE_PREFIX || [];
    const suffixes = data.BRANDABLE_SUFFIX || [];
    const both = data.BRANDABLE_BOTH || [];
    const kw = base || pick(both.length ? both : ['nova', 'swift', 'pulse', 'zen']);
    const domains = [];

    if (usePrefix && prefixes.length) {
      prefixes.slice(0, 20).forEach(p => { const n = p + cap(kw); if (n.length <= maxLen) { const d = makeDomain(n, kw); if (d) domains.push(d); } });
    }
    if (useSuffix && suffixes.length) {
      suffixes.slice(0, 20).forEach(s => { const n = cap(kw) + cap(s); if (n.length <= maxLen) { const d = makeDomain(n, kw); if (d) domains.push(d); } });
    }
    if (useBoth && prefixes.length && suffixes.length) {
      for (let i = 0; i < (smartMode ? 20 : 12); i++) {
        const p = pick(prefixes), s = pick(suffixes);
        const n = p + cap(kw) + cap(s);
        if (n.length <= maxLen) { const d = makeDomain(n, kw); if (d) domains.push(d); }
      }
    }
    if (useRandom && both.length) {
      for (let i = 0; i < (smartMode ? 25 : 15); i++) {
        const a = pick(both), b = pick(both);
        if (a !== b) { const n = cap(a) + cap(b); if (n.length <= maxLen) { const d = makeDomain(n, ''); if (d) domains.push(d); } }
      }
    }

    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateBrandable error:', e);
    return generateFallbackDomains('brand', limit);
  }
}

// === NUMERIC ===
export function generateNumeric({ keyword, numPattern, numLen, pure, hybrid, reverse, limit, smartMode }) {
  try {
    const kw = (keyword || '').toLowerCase();
    const domains = [];

    function genNum() {
      let n = '';
      if (numPattern === 'palindrome') {
        const h = Math.ceil(numLen / 2);
        for (let i = 0; i < h; i++) n += rand(1, 9);
        if (numLen % 2 === 0) n += n.split('').reverse().join('');
        else n += n.slice(0, -1).split('').reverse().join('');
      } else if (numPattern === 'repeating') {
        const d = rand(1, 9); for (let i = 0; i < numLen; i++) n += d;
      } else if (numPattern === 'sequential') {
        const s = rand(1, Math.max(1, 9 - numLen + 1)); for (let i = 0; i < numLen; i++) n += (s + i);
      } else if (numPattern === 'year') {
        n = pick(['2025', '2026', '2027', '2030']);
      } else {
        for (let i = 0; i < numLen; i++) n += rand(0, 9);
      }
      return n;
    }

    const count = smartMode ? limit * 2 : limit;
    for (let i = 0; i < count; i++) {
      const num = genNum();
      if (pure) { const d = makeDomain(num); if (d) domains.push(d); }
      if (hybrid && kw) { const d = makeDomain(kw + num, kw); if (d) domains.push(d); }
      if (reverse && kw) { const d = makeDomain(num + kw, kw); if (d) domains.push(d); }
    }

    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateNumeric error:', e);
    return generateFallbackDomains('numeric', limit);
  }
}

// === SUGGESTOR ===
export function generateSuggestor({ input, limit, smartMode }) {
  try {
    if (!input || !input.trim()) return generateFallbackDomains('suggest', limit);
    const kws = extractKeywords(input).slice(0, 5);
    if (!kws.length) return generateFallbackDomains(input.split(' ')[0], limit);
    const mods = smartMode
      ? ['Smart', 'Pro', 'HQ', 'Hub', 'AI', 'App', 'Now', 'Flow', 'Labs', 'Tech', 'Go', 'Get', 'My', 'Try', 'Best', 'Top']
      : ['Pro', 'Hub', 'HQ', 'AI', 'App', 'Now'];
    const domains = [];
    kws.forEach(kw => {
      mods.forEach(m => {
        const d1 = makeDomain(cap(kw) + m, kw); if (d1) domains.push(d1);
        const d2 = makeDomain(m + cap(kw), kw); if (d2) domains.push(d2);
      });
    });
    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateSuggestor error:', e);
    return generateFallbackDomains('suggest', limit);
  }
}

// === WORDLIST ===
export function generateWordlist({ listA, listB, separator, limit, smartMode }) {
  try {
    if (!listA.length || !listB.length) return generateFallbackDomains('wordlist', limit);
    const domains = [];
    listA.forEach(a => {
      listB.forEach(b => {
        const d = makeDomain(cap(a) + separator + cap(b));
        if (d) domains.push(d);
      });
    });
    return scoreAndLimit(domains, limit, smartMode);
  } catch (e) {
    console.error('generateWordlist error:', e);
    return generateFallbackDomains('wordlist', limit);
  }
}
