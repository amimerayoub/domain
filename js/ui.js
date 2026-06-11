// ui.js — Rendering results, cards, animations, filters
// STATE PERSISTENCE FIX: navigateToDomain() now saves domain before navigation
import { $, $$ } from './utils.js';
import { createActionMenu, closeAllActionMenus } from '../components/action-menu.js';
import { createContinueButton, createCopyButton, closeActiveDropdown } from '../components/domain-dropdown.js';
import { toggleFavorite, isFavorite } from './favorites.js';

// ── Navigate to domain details — SAVE STATE FIRST ─────────────
function navigateToDomain(domainName) {
  // Save in both sessionStorage (tab-isolated, preferred) and localStorage (fallback)
  try { sessionStorage.setItem('aiDomains_selected', domainName); } catch (e) {}
  try { localStorage.setItem('selected_domain', domainName); } catch (e) {}
  try { sessionStorage.setItem('currentDomain', domainName); } catch (e) {}
  try { localStorage.setItem('currentDomain', domainName); } catch (e) {}
  window.location.href = 'domain.html?domain=' + encodeURIComponent(domainName);
}

export const uiState = {
  filter: 'all',
  sort: 'relevance',
  visibilityFilter: 'all'  // 'all' | 'available'
};

export function getUiState() { return uiState; }

const STAR_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.09 6.26L20 9.27l-5 4.87L16.18 21L12 17.77 7.82 21 9 14.14 4 9.27l5.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

function createDomainCard(domain, index = 0) {
  const card = document.createElement('div');
  card.className = 'domain-card';
  card.style.animationDelay = (index * 0.035) + 's';

  const domainName = domain.name || domain.domain;

  let sc = 'status-checking';
  let st = 'Checking...';
  let isUnknown = false;
  if (domain.available === true) { sc = 'status-available'; st = '✓ Available'; }
  else if (domain.available === false) { sc = 'status-taken'; st = '✗ Registered'; }
  else if (domain.available === 'error' || domain.available === 'unknown' || domain.available === null) {
    sc = 'status-unknown'; st = '⚠ Check Failed'; isUnknown = true;
  }
  const favActive = isFavorite(domainName);
  const isAvail = domain.available === true;

  card.innerHTML = `
    <button class="btn-fav${favActive ? ' active' : ''}" data-domain="${domainName}" title="Add to Favorites">
      ${STAR_SVG}
      <span class="fav-pop"></span>
    </button>
    <div class="domain-name" style="cursor:pointer" data-nav-domain="${domainName}">${domainName}</div>
    <div class="domain-tlds" id="tlds-${domainName.replace(/\./g,'-')}"></div>
    <div class="domain-status ${sc}">
      <span class="status-dot"></span>
      <span>${st}</span>
      ${isUnknown ? `<button class="btn-retry-status" data-domain="${domainName}" style="margin-left: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--text-primary); font-size: 0.65rem; padding: 2px 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.15)'">Retry</button>` : ''}
    </div>
    <div class="card-actions"></div>`;

  const actionsEl = card.querySelector('.card-actions');
  if (isAvail) {
    actionsEl.appendChild(createContinueButton(domainName));
  } else {
    const copyBtn = createCopyButton(domainName);
    actionsEl.appendChild(copyBtn);
  }

  const nameEl = card.querySelector('.domain-name');
  if (nameEl) {
    nameEl.addEventListener('click', e => {
      e.stopPropagation();
      navigateToDomain(domainName);
    });
  }

  const favBtn = card.querySelector('.btn-fav');
  if (favBtn) {
    favBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (window.state && window.state.isChecking) {
        toast('Favorites are disabled while checking availability.');
        return;
      }
      const added = toggleFavorite(domain);
      favBtn.classList.toggle('active', added);
    });
  }

  const retryBtn = card.querySelector('.btn-retry-status');
  if (retryBtn) {
    retryBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('retry-domain-check', { detail: { domain: domainName } }));
    });
  }

  return card;
}

export function clearResults() {
  const grid = $('#resultsGrid');
  if (grid) {
    grid.style.transition = 'opacity 0.15s';
    grid.style.opacity = '0';
    setTimeout(() => {
      grid.innerHTML = '';
      grid.style.opacity = '1';
    }, 150);
  }
  closeAllActionMenus();
  const count = $('#resultsCount'); if (count) count.textContent = '0 domains';
  const avail = $('#resultsAvailableCount'); if (avail) avail.style.display = 'none';
  const empty = $('#resultsEmpty'); if (empty) empty.style.display = 'block';
  const loading = $('#resultsLoading'); if (loading) loading.classList.remove('active');
  uiState.sort = 'default';
  uiState.visibilityFilter = 'all';
  // Reset the filter dropdown UI
  const filterEl = $('#domainVisibilityFilter');
  if (filterEl) {
    filterEl.querySelectorAll('.select-option').forEach(o => o.classList.toggle('active', o.dataset.value === 'all'));
    const txt = filterEl.querySelector('.selected-text');
    if (txt) txt.textContent = 'All Domains';
  }
}

export function showLoading(show) {
  const loading = $('#resultsLoading');
  const empty = $('#resultsEmpty');
  const grid = $('#resultsGrid');
  if (loading) loading.classList.toggle('active', show);
  if (empty && show) empty.style.display = 'none';
  if (grid && show) { grid.innerHTML = ''; grid.style.opacity = '0'; }
}

// ── updateDomainCounter: updates both the "X generated" and "Y available" counters ──
export function updateDomainCounter(allDomains) {
  const countEl = $('#resultsCount');
  const availEl = $('#resultsAvailableCount');
  if (!allDomains || !allDomains.length) {
    if (countEl) countEl.textContent = '0 domains generated';
    if (availEl) availEl.style.display = 'none';
    return;
  }
  const total = allDomains.length;
  const availCount = allDomains.filter(d => d.available === true).length;
  if (countEl) countEl.textContent = total + ' domain' + (total !== 1 ? 's' : '') + ' generated';
  if (availEl) {
    if (availCount > 0) {
      availEl.textContent = availCount + ' available';
      availEl.style.display = '';
    } else {
      availEl.style.display = 'none';
    }
  }
}

export function renderResults(domains, title, onCopy) {
  const titleEl = $('#resultsTitle');
  const emptyEl = $('#resultsEmpty');
  const loadingEl = $('#resultsLoading');

  if (titleEl) titleEl.textContent = title || 'Generated Domains';
  if (loadingEl) loadingEl.classList.remove('active');

  closeAllActionMenus();

  if (!domains || !domains.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    const grid = $('#resultsGrid');
    if (grid) { grid.innerHTML = ''; grid.style.opacity = '1'; }
    updateDomainCounter([]);
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  updateDomainCounter(domains);

  applyFilterSort(domains, onCopy);
}

export function applyFilterSort(domains, onCopy) {
  let d = [...domains];

  // Apply visibility filter
  if (uiState.visibilityFilter === 'available') {
    d = d.filter(dom => dom.available === true);
  }

  if (uiState.sort === 'name') d.sort((a, b) => (a.name || a.domain).localeCompare(b.name || b.domain));

  const emptyEl = $('#resultsEmpty');

  // Show "no available" message if filter is active and result is empty
  if (d.length === 0 && uiState.visibilityFilter === 'available') {
    const grid = $('#resultsGrid');
    if (grid) { grid.innerHTML = ''; grid.style.opacity = '1'; }
    if (emptyEl) {
      emptyEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" style="width:40px;height:40px;color:var(--text-tertiary);margin:0 auto 12px;display:block"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><p>No available domains found</p><p style="font-size:.8rem;color:var(--text-tertiary);margin-top:6px">Availability checks may still be running...</p>`;
      emptyEl.style.display = 'block';
    }
    return;
  }

  if (emptyEl && d.length > 0) emptyEl.style.display = 'none';

  closeAllActionMenus();

  const grid = $('#resultsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.style.opacity = '0';
  grid.style.transition = 'opacity 0.2s';
  const fragment = document.createDocumentFragment();

  d.forEach((dom, i) => {
    const card = createDomainCard(dom, i);
    const copyBtn = card.querySelector('.btn-copy');
    const domName = dom.name || dom.domain;
    if (copyBtn && onCopy) {
      copyBtn.addEventListener('click', function () { onCopy(domName, this); });
    }
    createActionMenu(card, dom);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  requestAnimationFrame(() => { grid.style.opacity = '1'; });

  const rs = $('#resultsSection');
  if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderBulkResults(domains) {
  const grid = $('#resultsGrid');
  const emptyEl = $('#resultsEmpty');
  const loadingEl = $('#resultsLoading');
  const titleEl = $('#resultsTitle');
  const countEl = $('#resultsCount');

  if (loadingEl) loadingEl.classList.remove('active');
  if (titleEl) titleEl.textContent = 'Bulk Check Results';
  if (countEl) countEl.textContent = domains.length + ' domains checked';
  if (emptyEl) emptyEl.style.display = domains.length ? 'none' : 'block';

  if (!grid) return;
  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  domains.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'bulk-result-item';
    item.style.animationDelay = (i * 0.03) + 's';
    const a = d.available;
    let statusClass, statusText;
    if (a === 'checking') { statusClass = 'bulk-checking'; statusText = 'Checking...'; }
    else if (a === true) { statusClass = 'bulk-available'; statusText = '✓ Available'; }
    else if (a === false) { statusClass = 'bulk-taken'; statusText = '✗ Registered'; }
    else { statusClass = 'bulk-taken'; statusText = '⚠ Check Failed'; }
    const domName = d.name || d.domain;
    item.innerHTML = `<span class="bulk-domain" style="cursor:pointer">${domName}</span><span class="bulk-status ${statusClass}">${statusText}</span>`;
    item.querySelector('.bulk-domain').addEventListener('click', () => navigateToDomain(domName));
    fragment.appendChild(item);
  });
  grid.appendChild(fragment);
  grid.style.opacity = '1';
}

export function renderExtractedResults(items, type, onCopyAll) {
  const grid = $('#resultsGrid');
  const emptyEl = $('#resultsEmpty');
  const loadingEl = $('#resultsLoading');
  const titleEl = $('#resultsTitle');
  const countEl = $('#resultsCount');

  if (loadingEl) loadingEl.classList.remove('active');
  if (titleEl) titleEl.textContent = type === 'domain' ? 'Extracted Domains' : 'Extracted Emails';
  if (countEl) countEl.textContent = items.length + ' ' + (type === 'domain' ? 'domains' : 'emails') + ' found';
  if (emptyEl) emptyEl.style.display = items.length ? 'none' : 'block';

  if (!grid || !items.length) return;
  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();

  if (onCopyAll) {
    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = 'btn-generate';
    copyAllBtn.style.marginBottom = '14px';
    copyAllBtn.style.maxWidth = '200px';
    copyAllBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg>Copy All';
    copyAllBtn.addEventListener('click', function () { onCopyAll(this); });
    fragment.appendChild(copyAllBtn);
  }

  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'extracted-item';
    el.style.animationDelay = (i * 0.03) + 's';
    el.innerHTML = `<span>${item}</span><button class="btn-copy btn-copy-sm"><svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg></button>`;
    el.querySelector('.btn-copy').addEventListener('click', function () {
      navigator.clipboard.writeText(item).then(() => {
        this.classList.add('copied');
        this.innerHTML = '✓';
        setTimeout(() => { this.classList.remove('copied'); }, 1500);
      });
    });
    fragment.appendChild(el);
  });

  grid.appendChild(fragment);
  grid.style.opacity = '1';
}

export function showFilterControls(show) {
  const sort = $('#resultsSort');
  const limit = $('#resultLimit');
  const visFilter = $('#domainVisibilityFilter');
  if (sort) sort.style.display = show ? '' : 'none';
  if (limit) limit.style.display = show ? '' : 'none';
  if (visFilter) visFilter.style.display = show ? '' : 'none';
}

export function toast(msg) {
  const t = $('#toast');
  const m = $('#toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

export function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Copied!';
      toast('Copied: ' + text);
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy';
      }, 2000);
    } else {
      toast('Copied: ' + text);
    }
  }).catch(() => toast('Copied: ' + text));
}

export function setButtonState(btn, disabled) {
  if (!btn) return;
  btn.disabled = disabled;
  btn.style.opacity = disabled ? '0.5' : '1';
  btn.style.pointerEvents = disabled ? 'none' : '';
}

// ============================================================
// SMART DOMAIN ANALYZER RENDERING
// ============================================================

const STAR_SVG_SM = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.09 6.26L20 9.27l-5 4.87L16.18 21L12 17.77 7.82 21 9 14.14 4 9.27l5.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function renderAnalyzerResults(domains) {
  const grid = $('#resultsGrid');
  const emptyEl = $('#resultsEmpty');
  const countEl = $('#resultsCount');
  const titleEl = $('#resultsTitle');

  if (titleEl) titleEl.textContent = 'Analysis Results';
  
  closeAllActionMenus();

  if (!domains || !domains.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (grid) { grid.innerHTML = ''; grid.style.opacity = '1'; }
    if (countEl) countEl.textContent = '0 domains';
    const anaCountEl = $('#analyzerDomainCount');
    if (anaCountEl) anaCountEl.textContent = '0 matching';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (countEl) countEl.textContent = domains.length + ' domain' + (domains.length !== 1 ? 's' : '');
  
  const anaCountEl = $('#analyzerDomainCount');
  if (anaCountEl) anaCountEl.textContent = domains.length + ' of ' + (window._analyzerTotal || domains.length) + ' domains';

  if (!grid) return;
  grid.style.opacity = '0';
  grid.style.transition = 'opacity 0.2s';
  grid.innerHTML = '';

  const hasAdvanced = domains[0]?.scores;
  if (hasAdvanced) {
    renderAnalyzerTable(grid, domains);
  } else {
    // Basic cards with analyzer specific event handlers
    const fragment = document.createDocumentFragment();
    domains.forEach((d, i) => {
      const card = createDomainCard(d, i);
      const copyBtn = card.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () { copyText(d.name || d.domain, this); });
      }
      createActionMenu(card, d);
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  }
  
  requestAnimationFrame(() => { grid.style.opacity = '1'; });
  
  const rs = $('#resultsSection');
  if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalyzerTable(container, domains) {
  let html = '<div class="domain-list">';

  domains.forEach((d, i) => {
    const s = d.scores;
    const m = d.metrics;
    const c = d.classification;
    const favActive = isFavorite(d.name);
    const smartLabels = (d.smartLabels || []).slice(0, 3);
    
    // Professional SVG Icons
    const icoClock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const icoChart = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    const icoShield = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const icoDollar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`;
    const icoLink = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
    const icoText = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dc-svg-ico"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`;

    // Quality Icons
    const icoElite = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="dc-class-svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L16.18 21 12 17.77 7.82 21 9 14.14l-5-4.87 5.91-1.01L12 2z"/></svg>`;
    const icoBolt = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="dc-class-svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    const icoTrending = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="dc-class-svg"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
    const icoAlert = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="dc-class-svg"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const scoreColor = s.final >= 90 ? '#d97706' : s.final >= 75 ? '#16a34a' : s.final >= 60 ? '#3B82F6' : '#94a3b8';
    const dashOffset = 226 - (226 * s.final) / 100;

    html += `<div class="domain-card-row" data-idx="${i}" style="animation-delay:${i * 0.025}s">
      <!-- LEFT PANEL: ID & MAIN INFO -->
      <div class="dc-panel-left">
        <div class="dc-main-top">
          <p class="dc-name" data-domain='${JSON.stringify(d).replace(/'/g, "&#39;")}'>${d.name}</p>
          <span class="dc-badge ${d.available === true ? 'dc-avail' : d.available === 'checking' ? 'dc-checking' : (d.available === null || d.available === 'unknown' || d.available === 'error') ? 'dc-unknown' : 'dc-taken'}">
            <span class="dc-badge-dot"></span>${d.available === true ? '✓ Available' : d.available === 'checking' ? 'Checking...' : (d.available === null || d.available === 'unknown' || d.available === 'error') ? '⚠ Check Failed' : '✗ Registered'}
            ${(d.available === null || d.available === 'unknown' || d.available === 'error') ? `<button class="btn-retry-status" data-domain="${d.name}" style="margin-left: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--text-primary); font-size: 0.65rem; padding: 2px 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.15)'">Retry</button>` : ''}
          </span>
        </div>
        
        <div class="dc-score-wrap" style="--score-color: ${scoreColor}; background: conic-gradient(var(--score-color) ${s.final}%, rgba(255,255,255,0.06) 0%);">
          <div class="dc-score-inner">
            <span class="dc-score-val" style="color: ${scoreColor}">${s.final}</span>
            <span class="dc-score-label">SCORE</span>
          </div>
        </div>
      </div>

      <!-- CENTER PANEL: QUALITY & TAGS -->
      <div class="dc-panel-center">
        <div class="dc-class-badge ${c.cls}">
          <span class="dc-class-ico">
            ${c.cls === 'class-elite' ? icoElite : c.cls === 'class-highvalue' ? icoTrending : c.cls === 'class-goodflip' ? icoBolt : icoAlert}
          </span>
          <span class="dc-class-label">${c.label}</span>
        </div>
        <div class="dc-tags-grid">
          ${smartLabels.map(l => `<span class="dc-tag">${l}</span>`).join('')}
        </div>
      </div>

      <!-- RIGHT PANEL: METRICS & ACTIONS -->
      <div class="dc-panel-right">
        <div class="dc-metrics-grid">
          <div class="dc-metric-card" title="Domain Age">
            <div class="dc-m-icon m-age">${icoClock}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.age ? m.age + 'y' : '—'}</span>
              <span class="dc-m-lbl">AGE</span>
            </div>
          </div>
          <div class="dc-metric-card" title="Domain Popularity">
            <div class="dc-m-icon m-dp">${icoChart}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.dp ? formatNum(m.dp) : '—'}</span>
              <span class="dc-m-lbl">DP</span>
            </div>
          </div>
          <div class="dc-metric-card" title="Trust Flow">
            <div class="dc-m-icon m-tf">${icoShield}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.tf || '—'}</span>
              <span class="dc-m-lbl">TF</span>
            </div>
          </div>
          <div class="dc-metric-card" title="Cost Per Click">
            <div class="dc-m-icon m-cpc">${icoDollar}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.cpc ? '$' + m.cpc : '—'}</span>
              <span class="dc-m-lbl">CPC</span>
            </div>
          </div>
          <div class="dc-metric-card" title="Backlinks">
            <div class="dc-m-icon m-bl">${icoLink}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.bl ? formatNum(m.bl) : '—'}</span>
              <span class="dc-m-lbl">BL</span>
            </div>
          </div>
          <div class="dc-metric-card" title="Letters count">
            <div class="dc-m-icon m-le">${icoText}</div>
            <div class="dc-m-info">
              <span class="dc-m-val">${m.le || '—'}</span>
              <span class="dc-m-lbl">LE</span>
            </div>
          </div>
        </div>

        <div class="dc-footer">
          <div class="dc-actions">
            <button class="dc-btn-icon dc-fav${favActive ? ' active' : ''}" data-domain="${d.name}" title="Favorite">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.09 6.26L20 9.27l-5 4.87L16.18 21 12 17.77 7.82 21 9 14.14l-5-4.87 5.91-1.01L12 2z"/></svg>
            </button>
            <button class="dc-btn-icon dc-copy" data-domain="${d.name}" title="Copy Domain">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="dc-btn-icon dc-analyse" data-action="analyse" data-domain='${JSON.stringify(d).replace(/'/g, "&#39;")}' title="Deep Analysis">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </button>
            ${d.available === true ? `<div class="dc-continue-slot" data-continue-domain="${d.name}"></div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.dc-copy').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const domain = btn.dataset.domain;
      navigator.clipboard.writeText(domain).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
      });
    });
  });

  container.querySelectorAll('.dc-fav').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (window.state && window.state.isChecking) {
        toast('Favorites are disabled while checking availability.');
        return;
      }
      const domain = domains.find(d => d.name === btn.dataset.domain);
      if (domain) {
        const added = toggleFavorite(domain);
        btn.classList.toggle('active', added);
      }
    });
  });

  container.querySelectorAll('.btn-retry-status').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const domainName = btn.dataset.domain;
      if (domainName) {
        document.dispatchEvent(new CustomEvent('retry-domain-check', { detail: { domain: domainName } }));
      }
    });
  });

  container.querySelectorAll('.dc-analyse').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      let domainData;
      try { domainData = JSON.parse(btn.dataset.domain); } catch { return; }
      document.dispatchEvent(new CustomEvent('send-to-analyzer', { detail: { domain: domainData.name } }));
    });
  });

  container.querySelectorAll('.dc-name').forEach(cell => {
    cell.addEventListener('click', e => {
      e.stopPropagation();
      let domainData;
      try { domainData = JSON.parse(cell.dataset.domain); } catch { return; }
      navigateToDomain(domainData.name);
    });
  });

  container.querySelectorAll('.dc-continue-slot').forEach(slot => {
    const domain = slot.dataset.continueDomain;
    if (domain) slot.appendChild(createContinueButton(domain));
  });
}

function renderAnalyzerCards(container, domains) {
  container.innerHTML = `<div class="results-grid" id="analyzerGrid"></div>`;
  const grid = $('#analyzerGrid');
  grid.style.opacity = '0';
  const fragment = document.createDocumentFragment();

  domains.forEach((d, i) => {
    const card = document.createElement('div');
    card.className = 'domain-card';
    card.style.animationDelay = (i * 0.035) + 's';

    let sc = 'status-checking';
    let st = 'Checking...';
    let isUnknown = false;
    if (d.available === true) { sc = 'status-available'; st = '✓ Available'; }
    else if (d.available === false) { sc = 'status-taken'; st = '✗ Registered'; }
    else if (d.available === null || d.available === 'unknown' || d.available === 'error') {
      sc = 'status-unknown'; st = '⚠ Check Failed'; isUnknown = true;
    }
    const favActive = isFavorite(d.name);
    const isAvail = d.available === true;

    card.innerHTML = `
      <button class="btn-fav${favActive ? ' active' : ''}" data-domain="${d.name}" title="Add to Favorites">
        ${STAR_SVG_SM}<span class="fav-pop"></span>
      </button>
      <div class="domain-name" style="cursor:pointer">${d.name}</div>
      <div class="domain-status ${sc}">
        <span class="status-dot"></span>
        <span>${st}</span>
        ${isUnknown ? `<button class="btn-retry-status" data-domain="${d.name}" style="margin-left: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--text-primary); font-size: 0.65rem; padding: 2px 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.15)'">Retry</button>` : ''}
      </div>
      <div class="card-actions"></div>`;

    const actionsEl = card.querySelector('.card-actions');
    if (isAvail) {
      actionsEl.appendChild(createContinueButton(d.name));
    } else {
      const copyBtn = createCopyButton(d.name);
      actionsEl.appendChild(copyBtn);
      copyBtn.addEventListener('click', function () { copyText(d.name, this); });
    }

    const favBtn = card.querySelector('.btn-fav');
    if (favBtn) {
      favBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (window.state && window.state.isChecking) {
          toast('Favorites are disabled while checking availability.');
          return;
        }
        const added = toggleFavorite(d);
        favBtn.classList.toggle('active', added);
      });
    }

    const retryBtn = card.querySelector('.btn-retry-status');
    if (retryBtn) {
      retryBtn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('retry-domain-check', { detail: { domain: d.name } }));
      });
    }

    const nameEl = card.querySelector('.domain-name');
    if (nameEl) nameEl.addEventListener('click', () => navigateToDomain(d.name));

    createActionMenu(card, d);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  requestAnimationFrame(() => { grid.style.opacity = '1'; });
}

// Style injection for checking state styling
(function injectCheckingStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('availability-checking-styles')) return;
  const style = document.createElement('style');
  style.id = 'availability-checking-styles';
  style.textContent = `
    .checking-in-progress .btn-fav,
    .checking-in-progress .dc-fav {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }
    .status-unknown span {
      color: var(--text-secondary, #94a3b8) !important;
    }
    .status-unknown .status-dot {
      background-color: var(--text-secondary, #94a3b8) !important;
      box-shadow: 0 0 8px var(--text-secondary, #94a3b8) !important;
    }
    .dc-unknown {
      background: rgba(148, 163, 184, 0.1) !important;
      color: #94a3b8 !important;
      border: 1px solid rgba(148, 163, 184, 0.2) !important;
    }
    .dc-unknown .dc-badge-dot {
      background: #94a3b8 !important;
    }
  `;
  document.head.appendChild(style);
})();

function ensureProgressBar() {
  let barWrap = document.getElementById('availabilityProgressBarWrap');
  if (barWrap) return barWrap;

  const resultsHeader = document.querySelector('.results-header');
  if (!resultsHeader) return null;

  barWrap = document.createElement('div');
  barWrap.id = 'availabilityProgressBarWrap';
  barWrap.className = 'progress-bar-wrap';
  barWrap.style.cssText = `
    display: none;
    margin: 15px 0;
    padding: 12px 16px;
    background: var(--bg-secondary, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
    border-radius: var(--radius-md, 12px);
    box-shadow: var(--shadow-sm);
  `;
  barWrap.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">Checking Availability...</span>
      <span id="progressCountText" style="font-size:0.8rem; font-weight:600; color:var(--primary);">0 / 0 Domains</span>
    </div>
    <div style="width:100%; height:6px; background:rgba(255, 255, 255, 0.1); border-radius:3px; overflow:hidden;">
      <div id="progressFillBar" style="width:0%; height:100%; background:linear-gradient(90deg, var(--primary) 0%, var(--primary-hover, #6366f1) 100%); transition: width 0.3s ease;"></div>
    </div>
  `;
  resultsHeader.after(barWrap);
  return barWrap;
}

function ensureErrorBanner() {
  let errWrap = document.getElementById('availabilityErrorWrap');
  if (errWrap) return errWrap;

  const resultsHeader = document.querySelector('.results-header');
  if (!resultsHeader) return null;

  errWrap = document.createElement('div');
  errWrap.id = 'availabilityErrorWrap';
  errWrap.style.cssText = `
    display: none;
    margin: 15px 0;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md, 12px);
  `;
  errWrap.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:0.82rem; font-weight:600; color:#ef4444;">Some availability checks failed.</span>
      <button id="btnRetryAllFailed" class="btn-action-sm" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.75rem;">Retry Available</button>
    </div>
  `;
  resultsHeader.after(errWrap);
  return errWrap;
}

export function showAvailabilityProgress(checked, total, isChecking = true) {
  const barWrap = ensureProgressBar();
  const grid = document.getElementById('resultsGrid');
  
  if (grid) {
    grid.classList.toggle('checking-in-progress', isChecking);
  }

  if (isChecking) {
    const errWrap = document.getElementById('availabilityErrorWrap');
    if (errWrap) errWrap.style.display = 'none';
  }

  if (!isChecking || checked >= total) {
    if (barWrap) barWrap.style.display = 'none';
  } else {
    if (barWrap) {
      barWrap.style.display = 'block';
      const textEl = document.getElementById('progressCountText');
      const fillEl = document.getElementById('progressFillBar');
      if (textEl) textEl.textContent = `Checking ${checked} / ${total} Domains`;
      if (fillEl) fillEl.style.width = `${(checked / total) * 100}%`;
    }
  }
}

export function showAvailabilityErrorBanner(show = true) {
  const errWrap = ensureErrorBanner();
  if (errWrap) {
    errWrap.style.display = show ? 'block' : 'none';
  }
}
