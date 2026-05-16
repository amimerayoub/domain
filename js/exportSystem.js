/**
 * exportSystem.js — Advanced Domain Export System
 * Pure Vanilla JS · ES6+ · Blob API · No dependencies
 *
 * Features:
 *  - CSV / TXT / JSON export
 *  - Available-only iOS-style toggle
 *  - Live domain counter (total · available · exporting count)
 *  - Smart filename generation
 *  - Success toast after download
 *  - Copy available domains to clipboard
 *  - Keyboard accessible dropdown
 *  - Auto-close after action
 */

// ─── Internal state ───────────────────────────────────────────
let _domains = [];           // full domain list (updated externally)
let _availableOnly = false;  // toggle state
let _activeTool = 'geo';     // used in filename

// ─── Public API ───────────────────────────────────────────────

/**
 * Call this after generating / analyzing domains to sync the export system.
 * @param {Array}  domains   Array of domain objects { name|domain, available, scores?, metrics? }
 * @param {string} toolName  Current tool name — used for filename
 */
export function syncExportDomains(domains, toolName) {
  _domains = Array.isArray(domains) ? domains : [];
  _activeTool = toolName || 'domains';
  _refreshCounter();
  _refreshExportToggleBtn();
}

/**
 * Initialize the export UI — call once after DOM is ready.
 */
export function initExportSystem() {
  _buildUI();
  _attachEvents();
}

// ─── UI Builder ───────────────────────────────────────────────

function _buildUI() {
  const wrap = document.getElementById('exportDropdownWrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <!-- Export toggle button -->
    <button
      id="btnExportToggle"
      class="btn-action-sm export-toggle-btn"
      aria-haspopup="true"
      aria-expanded="false"
      disabled
      title="Export domains"
    >
      <svg viewBox="0 0 24 24" fill="none" class="exp-icon">
        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4 4-4M12 3v13"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span id="exportBtnLabel">Export</span>
      <svg viewBox="0 0 24 24" fill="none" class="exp-chevron">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Dropdown panel -->
    <div id="exportMenu" class="export-dropdown" role="menu" aria-hidden="true">

      <!-- Header row with counter -->
      <div class="exp-header">
        <span class="exp-header-title">
          <svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px;flex-shrink:0">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4 4-4M12 3v13"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Export Domains
        </span>
        <span id="exportCounterBadge" class="exp-counter-badge">0 domains</span>
      </div>

      <!-- Available-only toggle -->
      <div class="exp-toggle-row">
        <label class="exp-toggle-label" for="exportAvailableToggle">
          <svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px;color:var(--success,#22c55e);flex-shrink:0">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Available domains only
        </label>
        <label class="exp-ios-toggle">
          <input type="checkbox" id="exportAvailableToggle" role="switch" aria-checked="false"/>
          <span class="exp-ios-slider"></span>
        </label>
      </div>

      <!-- Live exporting count -->
      <div class="exp-scope-info" id="exportScopeInfo">
        <svg viewBox="0 0 24 24" fill="none" style="width:11px;height:11px;flex-shrink:0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span id="exportScopeText">Exporting all 0 domains</span>
      </div>

      <!-- Divider -->
      <div class="exp-divider"></div>

      <!-- Format options -->
      <div class="exp-section-label">Choose Format</div>

      <button class="exp-option" id="btnExportCSV" role="menuitem">
        <span class="exp-option-icon exp-icon-csv">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <div class="exp-option-text">
          <span class="exp-option-name">Export CSV</span>
          <span class="exp-option-desc">Spreadsheet with headers &amp; all metrics</span>
        </div>
        <span class="exp-shortcut">Ctrl+E</span>
      </button>

      <button class="exp-option" id="btnExportTXT" role="menuitem">
        <span class="exp-option-icon exp-icon-txt">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <div class="exp-option-text">
          <span class="exp-option-name">Export TXT</span>
          <span class="exp-option-desc">One domain per line, plain text</span>
        </div>
      </button>

      <button class="exp-option" id="btnExportJSON" role="menuitem">
        <span class="exp-option-icon exp-icon-json">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 13c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM18 13c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </span>
        <div class="exp-option-text">
          <span class="exp-option-name">Export JSON</span>
          <span class="exp-option-desc">Structured data with full metadata</span>
        </div>
      </button>

      <!-- Divider -->
      <div class="exp-divider" style="margin-top:6px"></div>

      <!-- Quick actions -->
      <div class="exp-section-label">Quick Actions</div>

      <button class="exp-option exp-option-ghost" id="btnCopyAvailable" role="menuitem">
        <span class="exp-option-icon exp-icon-copy">
          <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        <div class="exp-option-text">
          <span class="exp-option-name">Copy Available</span>
          <span class="exp-option-desc" id="copyAvailableDesc">Copy all available domains</span>
        </div>
      </button>

    </div><!-- /.export-dropdown -->
  `;
}

// ─── Event wiring ─────────────────────────────────────────────

function _attachEvents() {
  // Toggle dropdown
  document.addEventListener('click', e => {
    const toggleBtn = document.getElementById('btnExportToggle');
    const menu = document.getElementById('exportMenu');
    if (!toggleBtn || !menu) return;

    if (toggleBtn.contains(e.target)) {
      const isOpen = menu.classList.contains('open');
      _setMenuOpen(!isOpen);
    } else if (!menu.contains(e.target)) {
      _setMenuOpen(false);
    }
  });

  // Keyboard: Escape closes, arrow keys navigate
  document.addEventListener('keydown', e => {
    const menu = document.getElementById('exportMenu');
    if (!menu || !menu.classList.contains('open')) {
      // Ctrl+E opens export when results exist
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && _domains.length) {
        e.preventDefault();
        _setMenuOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { _setMenuOpen(false); document.getElementById('btnExportToggle')?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); _focusNextOption(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); _focusNextOption(-1); }
    // Ctrl+E while open → trigger CSV immediately
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); _doExport('csv'); }
  });

  // Available-only toggle
  document.addEventListener('change', e => {
    if (e.target.id === 'exportAvailableToggle') {
      _availableOnly = e.target.checked;
      e.target.setAttribute('aria-checked', String(_availableOnly));
      _refreshCounter();
    }
  });

  // Format buttons
  _on('btnExportCSV',      () => _doExport('csv'));
  _on('btnExportTXT',      () => _doExport('txt'));
  _on('btnExportJSON',     () => _doExport('json'));
  _on('btnCopyAvailable',  () => _copyAvailable());
}

// ─── Helpers ──────────────────────────────────────────────────

function _on(id, fn) {
  document.addEventListener('click', e => {
    const el = document.getElementById(id);
    if (el && el.contains(e.target)) fn(e);
  });
}

function _setMenuOpen(open) {
  const menu = document.getElementById('exportMenu');
  const btn  = document.getElementById('btnExportToggle');
  if (!menu || !btn) return;
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  btn.setAttribute('aria-expanded', String(open));
  if (open) {
    // Focus first option
    setTimeout(() => {
      const first = menu.querySelector('.exp-option:not([disabled])');
      if (first) first.focus();
    }, 60);
  }
}

function _focusNextOption(dir) {
  const menu = document.getElementById('exportMenu');
  if (!menu) return;
  const opts = [...menu.querySelectorAll('.exp-option:not([disabled])')];
  const curr = opts.indexOf(document.activeElement);
  const next = (curr + dir + opts.length) % opts.length;
  opts[next]?.focus();
}

function _getExportList() {
  if (_availableOnly) return _domains.filter(d => d.available === true);
  return _domains;
}

function _refreshCounter() {
  const total  = _domains.length;
  const avail  = _domains.filter(d => d.available === true).length;
  const exportN = _availableOnly ? avail : total;

  // Counter badge on toggle button
  const badge = document.getElementById('exportCounterBadge');
  if (badge) {
    badge.textContent = total
      ? `${total} domain${total !== 1 ? 's' : ''} · ${avail} available`
      : '0 domains';
  }

  // Scope info line
  const scopeTxt = document.getElementById('exportScopeText');
  if (scopeTxt) {
    scopeTxt.textContent = _availableOnly
      ? `Exporting ${avail} available domain${avail !== 1 ? 's' : ''}`
      : `Exporting all ${total} domain${total !== 1 ? 's' : ''}`;
  }

  // Copy button description
  const copyDesc = document.getElementById('copyAvailableDesc');
  if (copyDesc) {
    copyDesc.textContent = `${avail} available domain${avail !== 1 ? 's' : ''} to clipboard`;
  }
}

function _refreshExportToggleBtn() {
  const btn = document.getElementById('btnExportToggle');
  if (!btn) return;
  const hasData = _domains.length > 0;
  btn.disabled = !hasData;
  btn.style.opacity = hasData ? '1' : '0.45';
}

// ─── Filename generator ───────────────────────────────────────

function _buildFilename(ext) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const tool = (_activeTool || 'domains').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const scope = _availableOnly ? 'available' : 'all';
  return `${tool}-${scope}-${date}.${ext}`;
}

// ─── Download helper ──────────────────────────────────────────

function _download(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Export functions ─────────────────────────────────────────

function _doExport(format) {
  const list = _getExportList();
  if (!list.length) {
    _toastExport('No domains to export', false);
    _setMenuOpen(false);
    return;
  }

  _showLoadingPulse();

  // Micro-delay so animation shows, then export
  setTimeout(() => {
    try {
      switch (format) {
        case 'csv':  _exportCSV(list);  break;
        case 'txt':  _exportTXT(list);  break;
        case 'json': _exportJSON(list); break;
      }
      _setMenuOpen(false);
      _toastExport(`✓ Exported ${list.length} domain${list.length !== 1 ? 's' : ''} as .${format.toUpperCase()}`, true);
    } catch (err) {
      console.error('Export error:', err);
      _toastExport('Export failed — see console', false);
    }
    _clearLoadingPulse();
  }, 180);
}

function _exportCSV(list) {
  const headers = ['domain', 'status', 'score', 'cpc', 'backlinks', 'age', 'availability'];
  const rows = list.map(d => {
    const name   = d.name || d.domain || '';
    const status = d.available === true ? 'available' : d.available === false ? 'taken' : 'checking';
    const score  = d.scores?.final ?? d.score ?? '';
    const cpc    = d.metrics?.cpc ?? d.cpc ?? '';
    const bl     = d.metrics?.bl ?? d.backlinks ?? '';
    const age    = d.metrics?.age ?? d.age ?? '';
    const avail  = d.available === true ? '1' : d.available === false ? '0' : '';
    return [name, status, score, cpc, bl, age, avail].map(_csvCell).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\r\n');
  _download(csv, _buildFilename('csv'), 'text/csv;charset=utf-8;');
}

function _exportTXT(list) {
  const lines = list.map(d => {
    const name   = d.name || d.domain || '';
    const status = d.available === true ? ' [available]' : d.available === false ? ' [taken]' : '';
    return name + status;
  });
  _download(lines.join('\r\n'), _buildFilename('txt'), 'text/plain;charset=utf-8;');
}

function _exportJSON(list) {
  const date = new Date().toISOString();
  const payload = {
    meta: {
      exported_at:   date,
      tool:          _activeTool,
      total:         _domains.length,
      available:     _domains.filter(d => d.available === true).length,
      exported:      list.length,
      available_only: _availableOnly
    },
    domains: list.map(d => {
      const name   = d.name || d.domain || '';
      const status = d.available === true ? 'available' : d.available === false ? 'taken' : 'checking';
      const entry  = { domain: name, status };
      if (d.scores?.final != null) entry.score = d.scores.final;
      if (d.metrics) {
        if (d.metrics.cpc  != null) entry.cpc  = d.metrics.cpc;
        if (d.metrics.bl   != null) entry.backlinks = d.metrics.bl;
        if (d.metrics.age  != null) entry.age  = d.metrics.age;
        if (d.metrics.tf   != null) entry.trust_flow = d.metrics.tf;
        if (d.metrics.dp   != null) entry.domain_pop = d.metrics.dp;
      }
      if (d.classification?.label) entry.quality_class = d.classification.label;
      return entry;
    })
  };
  _download(JSON.stringify(payload, null, 2), _buildFilename('json'), 'application/json;charset=utf-8;');
}

function _csvCell(val) {
  const s = String(val ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ─── Copy available ───────────────────────────────────────────

function _copyAvailable() {
  const avail = _domains.filter(d => d.available === true);
  if (!avail.length) {
    _toastExport('No available domains to copy', false);
    _setMenuOpen(false);
    return;
  }
  const text = avail.map(d => d.name || d.domain).join('\n');
  navigator.clipboard.writeText(text)
    .then(() => {
      _toastExport(`✓ Copied ${avail.length} available domain${avail.length !== 1 ? 's' : ''} to clipboard`, true);
      _setMenuOpen(false);
    })
    .catch(() => {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      _toastExport(`✓ Copied ${avail.length} available domain${avail.length !== 1 ? 's' : ''} to clipboard`, true);
      _setMenuOpen(false);
    });
}

// ─── Toast ────────────────────────────────────────────────────

function _toastExport(msg, success = true) {
  // Use existing toast if available
  const toastEl  = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (toastEl && toastMsg) {
    toastMsg.textContent = msg;
    toastEl.classList.toggle('toast-error', !success);
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show', 'toast-error');
    }, 3000);
    return;
  }
  // Fallback inline toast
  let t = document.getElementById('_exportToast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_exportToast';
    t.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      padding:10px 18px;border-radius:10px;font-size:.82rem;font-weight:600;
      background:var(--bg-secondary,#1a1a2e);color:var(--text-primary,#fff);
      border:1px solid var(--glass-border,rgba(255,255,255,.1));
      box-shadow:0 8px 24px rgba(0,0,0,.4);
      transition:opacity .3s,transform .3s;opacity:0;transform:translateY(8px);
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderColor = success ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)';
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
  }, 2800);
}

// ─── Loading pulse ────────────────────────────────────────────

function _showLoadingPulse() {
  const btn = document.getElementById('btnExportToggle');
  if (btn) btn.classList.add('export-loading');
}

function _clearLoadingPulse() {
  const btn = document.getElementById('btnExportToggle');
  if (btn) btn.classList.remove('export-loading');
}
