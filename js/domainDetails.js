// domainDetails.js — Domain Analysis Page
// Uses unified /api/domain-full endpoint for all data
import { createContinueButton } from '../components/domain-dropdown.js';
import { initTheme } from './theme.js';
import { $ } from './utils.js';
import { toast } from './ui.js';
// ─── Helpers ────────────────────────────────────────────────────
function errHtml(msg) {
  return `<div class="dd-err"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>${msg}</span></div>`;
}
function safe(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 'Not Available';
  return val;
}
function row(label, value, mono) {
  const v = safe(value);
  return `<div class="dd-row"><span class="dd-lbl">${label}</span><span class="dd-val${mono ? ' mono' : ''}">${v}</span></div>`;
}
function fmtNum(n) {
  if (n === null || n === undefined || n === '-' || n === '') return 'Not Available';
  if (typeof n === 'string') return n;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

// ─── Progress ───────────────────────────────────────────────────
function setProgress(pct, text) {
  const fill = $('#progressFill'), lbl = $('#progressText'), bar = $('#progressBar');
  if (fill) fill.style.width = pct + '%';
  if (lbl) lbl.textContent = text || `Loading... ${pct}%`;
  if (pct >= 100 && bar) setTimeout(() => bar.classList.add('done'), 500);
}

// ─── Hero ───────────────────────────────────────────────────────
function renderHero(domain, data) {
  const parts = domain.split('.');
  const base = parts.slice(0, -1).join('.');
  const tld = '.' + parts[parts.length - 1];

  // Domain name with highlighted TLD and gradient
  const heroEl = $('#heroDomain');
  if (heroEl) {
    heroEl.innerHTML = `<span style="background: linear-gradient(90deg, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${base}</span><span class="dd-tld-hl">${tld}</span>`;
  }

  // Topbar domain
  const topDom = $('#topbarDomain');
  if (topDom) topDom.textContent = domain;

  // Status badge with enhanced glow
  const meta = $('#heroMeta');
  if (meta && data) {
    const status = data.overview?.status || 'unknown';
    let badgeCls = 'dd-badge-unk', badgeText = 'Unknown';
    if (status === 'registered') { badgeCls = 'dd-badge-reg'; badgeText = 'Registered'; }
    else if (status === 'available') { badgeCls = 'dd-badge-avail'; badgeText = 'Available'; }

    let html = `<span class="dd-badge ${badgeCls}"><span class="dd-badge-dot"></span>${badgeText}</span>`;
    html += `<span class="dd-badge-tld">${tld}</span>`;
    if (data.elapsed_ms) html += `<span class="dd-badge-time">${data.elapsed_ms}ms</span>`;
    meta.innerHTML = html;
  }

  // Update actions - clean action buttons
  const actionsEl = $('#heroActions');
  if (actionsEl) {
    if (data) {
      actionsEl.style.display = 'flex';
      actionsEl.innerHTML = '';
      const status = data.overview?.status || 'unknown';
      
      // Primary CTA for available domains
      if (status === 'available') {
        const btn = createContinueButton(domain);
        const innerBtn = btn.querySelector('.btn-continue');
        if (innerBtn) {
          innerBtn.className = 'btn-primary-orange';
          innerBtn.innerHTML = `Register Domain <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;margin-left:4px"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        actionsEl.appendChild(btn);
      }
      
      // Action buttons row
      const actionBtns = document.createElement('div');
      actionBtns.className = 'dd-hero-action-btns';
      actionBtns.innerHTML = `
        <a href="https://who.is/whois/${domain}" target="_blank" class="btn-action-glass-sm">Whois</a>
        <a href="https://www.google.com/search?q=${domain}" target="_blank" class="btn-action-glass-sm">Google</a>
        <a href="https://web.archive.org/web/*/${domain}" target="_blank" class="btn-action-glass-sm">Archive</a>
        <a href="https://www.spyfu.com/overview/domain?query=${domain}" target="_blank" class="btn-action-glass-sm">Analyze</a>
        <a href="https://completedns.com/dns-history/${encodeURIComponent(domain)}" target="_blank" class="btn-action-glass-sm btn-accent-green">DNS</a>
        <a href="https://www.whoxy.com/${encodeURIComponent(domain)}" target="_blank" class="btn-action-glass-sm btn-accent-orange">Whois+</a>
        <a href="https://www.atom.com/domain-appraisal/${encodeURIComponent(domain)}" target="_blank" class="btn-action-glass-sm btn-accent-purple">Value</a>
        <a href="https://dnshistory.org/historical-dns-records/soa/${encodeURIComponent(domain)}" target="_blank" class="btn-action-glass-sm btn-accent-red">History</a>
      `;
      actionsEl.appendChild(actionBtns);
    } else {
      actionsEl.style.display = 'none';
      actionsEl.innerHTML = '';
    }
  }
}

// ─── Section: Overview ──────────────────────────────────────────
function renderOverview(data) {
  const el = $('#overviewBody');
  if (!el) return;
  const o = data.overview;
  if (!o) { el.innerHTML = errHtml('No overview data'); return; }

  let html = '';
  html += row('Domain', o.domain, true);
  html += row('Base Name', o.base_name);
  html += row('TLD', o.tld);
  html += row('Status', o.status === 'registered' ? 'Registered' : o.status === 'available' ? 'Available' : 'Unknown');
  html += row('HTTPS', o.https === true ? 'Yes' : o.https === false ? 'No' : null);
  html += row('Reachable', o.reachable === true ? 'Yes' : o.reachable === false ? 'No' : null);
  html += row('DNS Provider', data.seo?.dns_provider);
  html += row('Mail Provider', data.seo?.mail_provider);
  el.innerHTML = html;
}

// ─── Section: TLD ───────────────────────────────────────────────
function renderTld(data) {
  const el = $('#tldBody');
  if (!el) return;
  const tlds = data.tlds;
  if (!tlds?.results || !Object.keys(tlds.results).length) { el.innerHTML = errHtml('TLD check unavailable'); return; }

  let html = '<div class="dd-tld-grid">';
  for (const [ext, status] of Object.entries(tlds.results)) {
    const isAvail = status === 'available';
    html += `<div class="dd-tld-chip"><span class="dd-tld-ext">.${ext}</span><span class="dd-tld-tag ${isAvail ? 'dd-tld-tag-avail' : 'dd-tld-tag-taken'}">${isAvail ? 'Available' : 'Taken'}</span></div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

// ─── Section: SEO ───────────────────────────────────────────────
function renderSeo(data) {
  const el = $('#seoBody');
  if (!el) return;
  const s = data.seo;
  if (!s) { el.innerHTML = errHtml('SEO data unavailable'); return; }

  const iconLink = '<svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const iconShield = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5.25-3.5 8.25-8 10-4.5-1.75-8-4.75-8-10V6l8-4z" stroke="currentColor" stroke-width="1.8"/></svg>';
  const iconChart = '<svg viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 16l4-4 4 4 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const iconServer = '<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function mc(icon, val, label) {
    return `<div class="dd-metric"><div class="dd-metric-icon">${icon}</div><div class="dd-metric-val">${safe(val)}</div><div class="dd-metric-lbl">${label}</div></div>`;
  }

  const bl = data.backlinks?.summary;
  let html = '<div class="dd-metrics">';
  html += mc(iconLink, fmtNum(bl?.total), 'Backlinks');
  html += mc(iconLink, fmtNum(bl?.dofollow), 'Dofollow');
  html += mc(iconShield, bl?.da_avg, 'Avg DA');
  html += mc(iconShield, bl?.da_max, 'Max DA');
  html += mc(iconChart, fmtNum(s.dns_records), 'DNS Records');
  html += mc(iconServer, s.ip_addresses?.length, 'IPs');
  html += mc(iconShield, s.has_ipv6 ? 'Yes' : 'No', 'IPv6');
  html += mc(iconServer, data.overview?.response_ms ? data.overview.response_ms + 'ms' : null, 'Latency');
  html += '</div>';
  el.innerHTML = html;
}

// ─── Section: Info ──────────────────────────────────────────────
function renderInfo(data) {
  const el = $('#infoBody');
  if (!el) return;
  const info = data.info;
  if (!info) { el.innerHTML = errHtml('Domain not registered or WHOIS unavailable'); return; }

  let html = '';
  html += row('Registrar', info.registrar);
  html += row('IANA ID', info.iana_id);
  html += row('Created', info.created);
  html += row('Expires', info.expires);
  html += row('Expiry Status', info.expiry_status);
  html += row('Days Until Expiry', info.days_until_expiry);
  html += row('DNSSEC', info.dnssec ? 'Signed' : 'Not signed');
  html += row('Status', Array.isArray(info.status) ? info.status.slice(0, 3).join(', ') : null);

  if (info.nameservers?.length) {
    html += '<div style="margin-top:10px"><span class="dd-lbl">Nameservers</span><div class="dd-ns" style="margin-top:6px">';
    info.nameservers.forEach(n => { html += `<div class="dd-ns-item">${n}</div>`; });
    html += '</div></div>';
  }
  el.innerHTML = html;
}

// ─── Section: Age ───────────────────────────────────────────────
function renderAge(data) {
  const el = $('#ageBody');
  if (!el) return;
  const age = data.age;
  if (!age) { el.innerHTML = errHtml('Age data unavailable'); return; }

  const catMap = { Mature: 'mature', Established: 'established', New: 'new' };
  const catCls = catMap[age.category] || 'new';

  let html = `<div class="dd-age-hero">
    <div><span class="dd-age-num">${age.years}</span><span class="dd-age-unit">years</span></div>
    <div class="dd-age-sub">${age.formatted || `${age.years}y ${age.months}m ${age.days}d`}</div>
    <span class="dd-age-cat ${catCls}">${age.category || 'Unknown'}</span>
  </div>`;
  html += row('Total Days', age.total_days ? fmtNum(age.total_days) : null);
  el.innerHTML = html;
}

// ─── Section: Reachability ──────────────────────────────────────
function renderReach(data) {
  const el = $('#reachBody');
  if (!el) return;
  const o = data.overview;
  if (!o || o.reachable === null) { el.innerHTML = errHtml('Reachability data unavailable'); return; }

  let html = `<div class="dd-reach-dot"><div class="dd-reach-indicator ${o.reachable ? 'on' : 'off'}"></div><span class="dd-reach-lbl">${o.reachable ? 'Online' : 'Offline'}</span></div>`;
  html += row('HTTPS', o.https ? 'Yes' : 'No');
  html += row('Response', o.response_ms ? o.response_ms + 'ms' : null);
  html += row('Server', o.server);
  el.innerHTML = html;
}

// ─── Section: DNS & Subdomains ──────────────────────────────────
function renderDns(data) {
  const el = $('#dnsBody');
  if (!el) return;
  const hist = data.dns_history;
  const dns = data.dns;

  let html = '';

  // Current nameservers
  if (hist?.current_nameservers?.length) {
    html += '<span class="dd-lbl" style="display:block;margin-bottom:6px">Current Nameservers</span><div class="dd-ns">';
    hist.current_nameservers.forEach(n => { html += `<div class="dd-ns-item">${n}</div>`; });
    html += '</div>';
  }

  // DNS records summary
  if (dns) {
    html += '<div style="margin-top:14px">';
    for (const [type, records] of Object.entries(dns)) {
      if (!records?.length) continue;
      html += `<div style="margin-bottom:8px"><span class="dd-lbl" style="display:block;margin-bottom:4px">${type.toUpperCase()} Records (${records.length})</span>`;
      records.slice(0, 5).forEach(r => {
        const val = r.exchange || r.data || JSON.stringify(r);
        html += `<div class="dd-ns-item" style="margin-bottom:2px">${typeof val === 'string' ? val.replace(/\.$/, '') : val}</div>`;
      });
      if (records.length > 5) html += `<div style="font-size:.65rem;color:var(--text-tertiary);padding:2px 10px">... and ${records.length - 5} more</div>`;
      html += '</div>';
    }
    html += '</div>';
  }

  // Subdomains
  if (hist?.subdomains?.length) {
    html += `<div style="margin-top:14px"><span class="dd-lbl" style="display:block;margin-bottom:6px">Subdomains Found (${hist.subdomains_found})</span><div class="dd-sub-list">`;
    hist.subdomains.forEach(s => {
      html += `<div class="dd-sub-item"><span class="dd-sub-host">${s.host}</span><span class="dd-sub-ip">${s.ip}</span></div>`;
    });
    html += '</div></div>';
  }

  if (!html) html = errHtml('No DNS data available');
  el.innerHTML = html;
}

// ─── Section: Top Backlinks ─────────────────────────────────────
function renderBacklinks(data) {
  const el = $('#backlinksBody');
  if (!el) return;
  const bl = data.backlinks?.top_10;
  if (!bl?.length) { el.innerHTML = errHtml('No backlink data found'); return; }

  let html = '<div style="overflow-x:auto"><table class="dd-bl-table"><thead><tr><th>Source</th><th>Anchor</th><th>DA</th><th>Type</th><th>Date</th></tr></thead><tbody>';
  bl.forEach(b => {
    const url = b.source_url || '';
    let host = '';
    try { host = new URL(url).hostname; } catch { host = url.slice(0, 40); }
    const da = b.da;
    const daCls = da >= 50 ? 'hi' : da >= 20 ? 'mid' : 'lo';
    const typeCls = b.nofollow ? 'nofollow' : 'dofollow';
    html += `<tr>
      <td><a href="${url}" target="_blank" rel="noopener">${host}</a></td>
      <td>${(b.anchor_text || '-').slice(0, 50)}</td>
      <td><span class="dd-bl-da ${daCls}">${da ?? '-'}</span></td>
      <td><span class="dd-bl-type ${typeCls}">${typeCls}</span></td>
      <td style="white-space:nowrap">${b.found_date || '-'}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

// ─── Module Status ──────────────────────────────────────────────
function renderModules(data) {
  const el = $('#moduleStatus');
  if (!el || !data.modules) return;
  el.style.display = '';
  let html = '';
  for (const [mod, status] of Object.entries(data.modules)) {
    html += `<span class="dd-mod ${status === 'ok' ? 'dd-mod-ok' : 'dd-mod-fail'}">${mod}: ${status}</span>`;
  }
  el.innerHTML = html;
}

// ─── Export ─────────────────────────────────────────────────────
function exportJson(domain) {
  const blob = new Blob([JSON.stringify(apiData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${domain}-analysis.json`; a.click();
  URL.revokeObjectURL(url);
  toast('JSON exported');
}

function exportCsv(domain) {
  const rows = [['Field', 'Value']];
  function flat(obj, pre) {
    for (const [k, v] of Object.entries(obj || {})) {
      const key = pre ? `${pre}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key);
      else rows.push([key, Array.isArray(v) ? v.join('; ') : String(v ?? '')]);
    }
  }
  flat(apiData);
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${domain}-analysis.csv`; a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported');
}

// ─── Smart Back Navigation ──────────────────────────────────────
window.smartBack = function(e) {
  if (e) e.preventDefault();
  
  // Smooth fade out transition
  document.body.style.transition = 'opacity 0.2s ease-out';
  document.body.style.opacity = '0';
  
  setTimeout(() => {
    const ref = document.referrer;
    // Check if the referrer is from our own site and we have history
    const isInternal = ref && ref.indexOf(window.location.origin) === 0;
    
    if (isInternal && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  }, 200);
};

// Handle BFCache (Back-Forward Cache) to restore visibility
window.addEventListener('pageshow', (e) => {
  if (e.persisted || document.body.style.opacity === '0') {
    document.body.style.transition = 'opacity 0.3s ease-in';
    document.body.style.opacity = '1';
  }
});

function getDomain() {
  // 1. Try URL param
  const params = new URLSearchParams(window.location.search);
  let domain = params.get("domain");

  if (domain) {
    try {
      sessionStorage.setItem("currentDomain", domain.trim().toLowerCase());
      localStorage.setItem("currentDomain", domain.trim().toLowerCase());
    } catch (e) {}
  }

  // 2. Try sessionStorage fallback
  if (!domain) {
    domain = sessionStorage.getItem("currentDomain");
  }

  // 3. Try localStorage fallback
  if (!domain) {
    domain = localStorage.getItem("currentDomain");
  }

  // 4. Validate
  if (!domain || typeof domain !== "string") {
    console.error("No domain found");
    return null;
  }

  return domain.trim().toLowerCase();
}

function showError(msg) {
  const main = document.querySelector('.dd-main');
  if (main) {
    main.innerHTML = `<div class="dd-page-err">
      <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <h2>${msg}</h2><p>Please check your URL or specify a valid domain.</p>
      <a href="#" onclick="window.smartBack(event)" class="btn-action-glass" style="margin-top:14px;padding:10px 18px;font-size:.82rem;">Back to Dashboard</a>
    </div>`;
  }
}

function hideLoading() {
  const bar = $('#progressBar');
  if (bar) bar.classList.add('done');
}

// ─── Init ───────────────────────────────────────────────────────
async function init() {
  initTheme();
  
  const ddBackBtn = $('#ddBackBtn');
  if (ddBackBtn) ddBackBtn.addEventListener('click', window.smartBack);

  const domain = getDomain();

  if (!domain) {
    showError("No domain specified");
    hideLoading();
    return;
  }

  document.title = `${domain} — Domain Analysis`;
  renderHero(domain, null);
  
  // 1. Try to restore from cache first instantly
  try {
    const cached = sessionStorage.getItem(`analyzer_cache_${domain}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.success) {
        setProgress(100, 'Restored from cache');
        executeRenderFlow(domain, parsed);
        return;
      }
    }
  } catch(e) {}

  // 2. Fetch fresh data
  await loadDomainData(domain);
}

let currentAbortController = null;
let apiData = null;

async function loadDomainData(domain, isRetry = false) {
  console.log("Starting analyzer for domain:", domain);
  setProgress(10, 'Connecting to analysis API...');
  
  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();
  
  // Use relative path for Vercel
  const url = `/api/domain-full?domain=${encodeURIComponent(domain)}`;
  console.log("Fetching:", url);
  
  try {
    setProgress(20, 'Fetching domain intelligence...');
    
    // 8-second timeout wrapper
    const timeoutId = setTimeout(() => {
      if (currentAbortController) currentAbortController.abort('timeout');
    }, 8000);

    const r = await fetch(url, { signal: currentAbortController.signal });
    clearTimeout(timeoutId);
    
    console.log("Response status:", r.status, r.ok);
    
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    setProgress(70, 'Processing results...');
    
    // Parse JSON safely
    let parsedJson;
    try {
      parsedJson = await r.json();
      console.log("JSON:", parsedJson);
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
      throw new Error('Invalid JSON response from API');
    }

    // Normalize response format
    if (parsedJson.data && typeof parsedJson.data === 'object') {
      apiData = parsedJson.data;
      apiData.success = parsedJson.success !== false;
    } else {
      apiData = parsedJson;
    }

    if (apiData.success === false || (!apiData.success && !apiData.domain)) {
      throw new Error(apiData.error || 'API returned failure');
    }

    setProgress(90, 'Rendering...');
    
    // Save to cache
    try { sessionStorage.setItem(`analyzer_cache_${domain}`, JSON.stringify(apiData)); } catch(e) {}

    executeRenderFlow(domain, apiData);
    setProgress(100, 'Complete');
    console.log("Render complete");

  } catch (e) {
    setProgress(100, 'Error');
    console.error('Domain analysis error clearly caught:', e);
    renderErrorFallback(domain, e);
  }
}

function renderErrorFallback(domain, error) {
  const isTimeout = error === 'timeout' || error.name === 'AbortError' || (error.message && error.message.includes('timeout'));
  const errorMsg = isTimeout ? 'Connection timed out (8s)' : 'Failed to connect to analysis server';
  
  // Generate partial fallback data
  const parts = domain.split('.');
  const tld = parts.length > 1 ? '.' + parts.pop() : '.com';
  const base = parts.join('.');
  
  apiData = {
    success: true,
    isFallback: true,
    overview: { domain, base_name: base, tld, status: 'unknown' },
    seo: { dns_records: 0 },
    info: { status: ['Unknown'] },
    age: { years: 0, category: 'new' }
  };
  
  // Show error banner at the top of contentGrid
  const grid = $('#contentGrid');
  if (grid) {
    // Ensure skeletons are wiped by running the render flow
    executeRenderFlow(domain, apiData);
    
    // Insert error banner
    const bannerHtml = `
      <div class="dd-card dd-card-full" id="secErrorBanner" style="border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
        <div class="dd-card-content" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;">
          <div style="display: flex; align-items: center; gap: 12px; color: #ef4444;">
            <svg viewBox="0 0 24 24" fill="none" style="width:24px;height:24px"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">Unable to analyze domain fully</div>
              <div style="font-size: 0.8rem; opacity: 0.8;">${errorMsg}. Showing partial data.</div>
            </div>
          </div>
          <button id="btnRetryAnalysis" class="btn-primary-orange" style="padding: 8px 16px; font-size: 0.85rem;">
            <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;margin-right:6px"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Retry Analysis
          </button>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('afterbegin', bannerHtml);
    
    $('#btnRetryAnalysis')?.addEventListener('click', () => {
      $('#secErrorBanner')?.remove();
      // Re-add skeletons
      resetToSkeletons();
      loadDomainData(domain, true);
    });
  }
}

function resetToSkeletons() {
  const skeletonHtml = (short) => `<div class="dd-skel"><div class="dd-skel-line"></div>${short?'':'<div class="dd-skel-line short"></div>'}<div class="dd-skel-line"></div></div>`;
  
  if ($('#overviewBody')) $('#overviewBody').innerHTML = skeletonHtml(false);
  if ($('#tldBody')) $('#tldBody').innerHTML = skeletonHtml(true);
  if ($('#seoBody')) $('#seoBody').innerHTML = skeletonHtml(false);
  if ($('#infoBody')) $('#infoBody').innerHTML = skeletonHtml(false);
  if ($('#ageBody')) $('#ageBody').innerHTML = skeletonHtml(true);
  if ($('#reachBody')) $('#reachBody').innerHTML = skeletonHtml(true);
  if ($('#dnsBody')) $('#dnsBody').innerHTML = skeletonHtml(false);
  if ($('#backlinksBody')) $('#backlinksBody').innerHTML = skeletonHtml(true);
  
  $('#secSeo').style.display = '';
  $('#secInfo').style.display = '';
  $('#secAge').style.display = '';
  $('#secDns').style.display = '';
  $('#secBacklinks').style.display = '';
  $('#secAvailableMsg')?.remove();
  
  setProgress(0, 'Retrying...');
}

function executeRenderFlow(domain, apiData) {
  const grid = $('#contentGrid');
  
  if (grid) {
    grid.style.transition = 'opacity 0.2s ease-out';
    grid.style.opacity = '0';
  }

  setTimeout(() => {
    renderHero(domain, apiData);
    renderOverview(apiData);
    renderTld(apiData);
    
    const isAvailable = apiData.overview?.status === 'available';
    
    if (isAvailable) {
      $('#secSeo').style.display = 'none';
      $('#secInfo').style.display = 'none';
      $('#secAge').style.display = 'none';
      $('#secDns').style.display = 'none';
      $('#secBacklinks').style.display = 'none';
      
      if (grid && !$('#secAvailableMsg')) {
        grid.insertAdjacentHTML('beforeend', `
          <div class="dd-card dd-card-full" id="secAvailableMsg">
            <div class="dd-card-content" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
              <svg viewBox="0 0 24 24" fill="none" style="width: 48px; height: 48px; color: #4ade80; opacity: 0.8; margin-bottom: 12px; margin: 0 auto 12px;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <h2 style="font-family: var(--font-primary); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px;">Domain is available</h2>
              <p style="margin-bottom: 20px;">No historical data yet. Register it now before someone else does!</p>
              <div style="display: flex; gap: 10px; justify-content: center;">
                <a href="https://www.namecheap.com/domains/registration/results/?domain=${domain}" target="_blank" class="btn-primary-orange" style="padding: 12px 24px;">Register Now</a>
                <a href="https://tld-list.com/tld/${domain.split('.').pop()}" target="_blank" class="btn-action-glass" style="padding: 12px 24px;">Compare Prices</a>
              </div>
            </div>
          </div>
        `);
      }
    } else {
      renderInfo(apiData);
      renderAge(apiData);
      
      const hasRealSEO = apiData.backlinks?.summary?.total > 0;
      if (hasRealSEO) {
        renderSeo(apiData);
        renderBacklinks(apiData);
      } else {
        $('#secSeo').style.display = 'none';
        $('#secBacklinks').style.display = 'none';
      }
      
      const hasDns = apiData.dns && Object.keys(apiData.dns).length > 0;
      const hasDnsHistory = apiData.dns_history?.subdomains?.length > 0 || apiData.dns_history?.current_nameservers?.length > 0;
      if (hasDns || hasDnsHistory) {
        renderDns(apiData);
      } else {
        $('#secDns').style.display = 'none';
      }
    }

    renderReach(apiData);
    renderModules(apiData);

    // Show export
    const exp = $('#exportBar');
    if (exp) exp.style.display = '';
    
    // Safe listener binding (remove old first to prevent leaks)
    const btnJson = $('#btnExportJson');
    const btnCsv = $('#btnExportCsv');
    
    if (btnJson) {
      const newBtnJson = btnJson.cloneNode(true);
      btnJson.parentNode.replaceChild(newBtnJson, btnJson);
      newBtnJson.addEventListener('click', () => exportJson(domain));
    }
    
    if (btnCsv) {
      const newBtnCsv = btnCsv.cloneNode(true);
      btnCsv.parentNode.replaceChild(newBtnCsv, btnCsv);
      newBtnCsv.addEventListener('click', () => exportCsv(domain));
    }
    
    if (grid) {
      requestAnimationFrame(() => {
        grid.style.opacity = '1';
      });
    }
  }, 200);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch(console.error);
});// ─── Models to try in order (most capable → lightest) ────────────────────────
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview', // Primary: Best overall balance of capability, speed, and generous free limits
  'gemini-2.5-flash-lite'
  // Fallback 1: The newest lightweight model, incredibly fast and cost-effective
  // Fallback 2: Solid, highly reliable previous-generation model
  // Fallback 4: Smartest model, but has the lowest free-tier RPM (Requests Per Minute)
];

