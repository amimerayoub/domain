// components/action-menu.js — Domain analysis action menu
// Premium glassmorphism dropdown styled exactly like domain-dropdown.js

const EXTERNAL_SVG = `<svg viewBox="0 0 24 24" fill="none" style="width:11px;height:11px;flex-shrink:0;opacity:.4"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Helper function to extract a clean query separated by spaces from camel/PascalCase domains (e.g., ToweringChair.com -> Towering Chair)
function getCleanQuery(domainName) {
  const base = domainName.split('.')[0];
  const spaced = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const ACTION_LINKS = {
  analysis: [
    { id: 'whois', label: 'Whois', icon: 'whois.png', url: d => `https://whois.domaintools.com/${d}` },
    { id: 'google', label: 'Search', icon: 'google.png', url: d => `https://www.google.com/search?q=${encodeURIComponent(getCleanQuery(d))}` },
    { id: 'spyfu', label: 'SpyFu', icon: 'spyfu.png', url: d => `https://www.spyfu.com/keyword/overview?query=${encodeURIComponent(getCleanQuery(d))}` },
    { id: 'dotdb', label: 'DotDB', icon: 'dotdb.png', url: d => `https://dotdb.com/search?keyword=${d}` },
    { id: 'archive', label: 'Wayback Machine', icon: 'archive.png', url: d => `https://web.archive.org/web/*/${d}` },
    { id: 'namebio', label: 'Comparable Sales', icon: 'pc.png', url: d => `https://namebio.com/?term=${d.split('.')[0]}` },
    { id: 'gmaps', label: 'Google Maps', icon: 'gmaps.png', url: d => `https://www.google.com/maps/search/${encodeURIComponent(getCleanQuery(d))}` },
    { id: 'yelp', label: 'Yelp', icon: 'Yelp.png', url: d => `https://www.yelp.com/search?find_desc=${encodeURIComponent(getCleanQuery(d))}` },
  ],
  seo: [
    { id: 'spamcheck', label: 'Spam', icon: 'spam.png', url: d => `https://www.spamhaus.org/query/domain/${d}` },
    { id: 'trademark', label: 'Trademark', icon: 'trademark.png', url: () => 'https://tmsearch.uspto.gov/search/search-information' },
  ],
  appraisal: [
    { id: 'godaddy', label: 'GoDaddy', icon: 'godaddy.png', url: d => `https://www.godaddy.com/domain-value-appraisal/appraisal/?domainToCheck=${d}` },
    { id: 'dynadot-app', label: 'Dynadot', icon: 'dynadot.png', url: d => `https://www.dynadot.com/domain/appraisal?domain=${d}` },
  ]
};

let activeMenu = null;

function positionDropdown(panel, trigger) {
  const rect = trigger.getBoundingClientRect();
  const pw = 300; // 300px width fits 2-column layout perfectly
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right - pw;
  let top = rect.bottom + 6;

  if (left < 10) left = 10;
  if (left + pw > vw - 10) left = vw - pw - 10;

  panel.style.position = 'fixed';
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.style.width = pw + 'px';

  requestAnimationFrame(() => {
    const menuH = panel.scrollHeight;
    if (top + menuH > vh - 10 && rect.top - menuH - 6 > 10) {
      panel.style.top = (rect.top - menuH - 6) + 'px';
    }
  });
}

export function createActionMenu(card, domain) {
  const existing = card.querySelector('.domain-action-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'domain-action-menu';

  const domainName = domain.name || domain;

  // Analyse trigger button
  const trigger = document.createElement('button');
  trigger.className = 'btn-analyse';
  trigger.title = 'Click for external tools · "Send to Smart Analyzer" in menu';
  trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343 5.657l-.707-.707m2.828 2.828l-.707.707M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Analyse';

  // Dropdown panel
  const panel = document.createElement('div');
  panel.className = 'domain-dropdown dd-open';
  panel.dataset.domain = domainName;

  let html = '';

  // 1. Analysis Tools (2-column layout)
  html += '<div class="dd-section-label">Analysis</div>';
  html += '<div class="dd-links" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">';
  ACTION_LINKS.analysis.forEach(a => {
    html += `<a href="${a.url(domainName)}" target="_blank" rel="noopener" class="dd-link dd-registrar-link" style="padding: 6px 8px;">
      <img src="/assets/aidomains/${a.icon}" loading="lazy" class="dd-link-icon" />
      <span class="dd-link-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.label}</span>
      ${EXTERNAL_SVG}
    </a>`;
  });
  html += '</div>';

  // 2. SEO & Research (2-column layout)
  html += '<div class="dd-divider"></div>';
  html += '<div class="dd-section-label">SEO &amp; Research</div>';
  html += '<div class="dd-links" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">';
  ACTION_LINKS.seo.forEach(a => {
    html += `<a href="${a.url(domainName)}" target="_blank" rel="noopener" class="dd-link dd-registrar-link" style="padding: 6px 8px;">
      <img src="/assets/aidomains/${a.icon}" loading="lazy" class="dd-link-icon" />
      <span class="dd-link-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.label}</span>
      ${EXTERNAL_SVG}
    </a>`;
  });
  html += '</div>';

  // 3. Appraisal (2-column layout)
  html += '<div class="dd-divider"></div>';
  html += '<div class="dd-section-label">Appraisal</div>';
  html += '<div class="dd-links" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">';
  ACTION_LINKS.appraisal.forEach(a => {
    html += `<a href="${a.url(domainName)}" target="_blank" rel="noopener" class="dd-link dd-registrar-link" style="padding: 6px 8px;">
      <img src="/assets/aidomains/${a.icon}" loading="lazy" class="dd-link-icon" />
      <span class="dd-link-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.label}</span>
      ${EXTERNAL_SVG}
    </a>`;
  });
  html += '</div>';

  // 4. Send to Smart Analyzer (Full-width button)
  html += '<div class="dd-divider"></div>';
  html += '<div class="dd-links">';
  html += `<button class="dd-link dd-tool-link" data-action="send-to-analyzer" style="padding: 6px 8px;">
    <img src="/assets/aidomains/pc.png" loading="lazy" class="dd-link-icon" />
    <span class="dd-link-text" style="font-weight: 600;">Send to Smart Analyzer</span>
  </button>`;
  html += '</div>';

  panel.innerHTML = html;

  menu.appendChild(trigger);
  card.appendChild(menu);

  // Toggle handler
  trigger.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    // Close any open menu first
    if (activeMenu) {
      const isSame = activeMenu.panelEl === panel;
      closeAllActionMenus();
      if (isSame) return;
    }

    document.body.appendChild(panel);
    positionDropdown(panel, trigger);
    panel.classList.add('dd-open');
    activeMenu = { panelEl: panel, trigger };
  });

  // "Send to Smart Analyzer" button
  panel.querySelectorAll('[data-action="send-to-analyzer"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      closeAllActionMenus();
      document.dispatchEvent(new CustomEvent('send-to-analyzer', { detail: { domain: domainName } }));
    });
  });
}

export function closeAllActionMenus() {
  if (activeMenu) {
    activeMenu.panelEl.classList.remove('dd-open');
    const panelToRemove = activeMenu.panelEl;
    setTimeout(() => {
      if (!panelToRemove.classList.contains('dd-open') && panelToRemove.parentNode) {
        panelToRemove.remove();
      }
    }, 180);
    activeMenu = null;
  }
}

// Close menu when clicking outside
document.addEventListener('click', e => {
  if (activeMenu && !activeMenu.panelEl.contains(e.target) && !e.target.closest('.btn-analyse')) {
    closeAllActionMenus();
  }
});

// Close menu on ESC key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeMenu) {
    const trigger = activeMenu.trigger;
    closeAllActionMenus();
    if (trigger) trigger.focus();
  }
});

// Close menu on scroll and resize
window.addEventListener('scroll', () => {
  if (activeMenu) closeAllActionMenus();
}, { passive: true });

window.addEventListener('resize', () => {
  if (activeMenu) closeAllActionMenus();
});
