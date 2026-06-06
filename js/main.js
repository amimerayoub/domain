// main.js — App init + navigation + event wiring
import { $, $$, cap, sanitizeInput, extractKeywords, debounce } from './utils.js';
import { loadData } from './dataLoader.js';
import { genState, generateGeo, generateKeyword, generatePattern, validatePattern, previewPattern, generateBrandable, generateNumeric, generateSuggestor, generateWordlist } from './generators.js';
import { clearResults, showLoading, renderResults, renderBulkResults, renderExtractedResults, renderAnalyzerResults, showFilterControls, toast, copyText, setButtonState, uiState, applyFilterSort, updateDomainCounter, showAvailabilityProgress, showAvailabilityErrorBanner } from './ui.js';
import { initExportSystem, syncExportDomains } from './exportSystem.js';
import { setCachedAvailability } from './state-manager.js';
import { initCustomSelects, getSelectValue } from '../components/dropdown.js';
import { initTheme, toggleTheme } from './theme.js';
import { closeAllActionMenus } from '../components/action-menu.js';
import { initFavorites, openFavoritesPanel, setFavoritesChangeListener, getFavoritesCount, isFavorite, toggleFavorite } from './favorites.js';
import { analyzeDomains, filterDomains, detectMode } from './domainAnalyzer.js';
import { emailState, parseCSVText, parsePastedEmails, cleanContacts, replaceVariables, startCampaign, pauseCampaign, resumeCampaign, stopCampaign, resetCampaign, generatePreview, getDelay } from './emailTool.js';
import { generateDomainNews, clearCache } from '../services/newsGenOrchestrator.js';
import { initCampaignManager } from './campaignManager.js';
import { loadAllApiKeys, saveAllApiKeys, loadAiProvider, saveAiProvider } from '../services/apiSettings.js';
import { bulkCheckDomains, updateResultsGridUI, updateAnalyzerUI, updateBulkResultsUI, applyResultsToData } from './bulkChecker.js';

// State
const state = {
  activeTool: 'home',
  domains: [],
  limit: 50,
  smartMode: true
};

// Gen Domain News state
const genNewsState = {
  mode: 'GEO',       // GEO | BRANDABLE | PATTERN | HYBRID
  aiProvider: 'auto' // gemini | grok | auto
};

const GEN_MODE_HINTS = {
  GEO:       '<strong>GEO:</strong> City + Keyword combinations — targeted local service domains',
  BRANDABLE: '<strong>BRANDABLE:</strong> Short startup-style names with creative prefixes/suffixes',
  PATTERN:   '<strong>PATTERN:</strong> Pronounceable CVC/CVVC letter patterns — unique invented names',
  HYBRID:    '<strong>HYBRID:</strong> Mix of brandable + pattern — e.g. ZentroHub, NexviaLabs'
};

const AI_PROVIDER_HINTS = {
  auto:   'Auto: tries Gemini first, switches to Grok automatically if unavailable',
  gemini: 'Gemini only: uses Google Gemini API exclusively for generation',
  grok:   'Grok only: uses xAI Grok API exclusively for generation'
};

const titles = {
  home: 'AI Domain Generator',
  geo: 'Geo Domain Generator', keyword: 'Keyword Domain Generator',
  pattern: 'Pattern Domain Generator', brandable: 'Brandable Name Generator',
  numeric: 'Numeric Domain Generator', suggestor: 'Domain Suggestor',
  wordlist: 'WordList Combiner', analyzer: 'Smart Domain Analyzer',
  emailtool: 'Smart Email Tool',
  bulkcheck: 'Bulk Domain Checker',
  extractor: 'Domain Extractor', texttools: 'Text Tools', emailextractor: 'Email Extractor',
  newsdomain: 'Gen Domain News'
};

// Clean URL routing
const ROUTE_MAP = {
  geo: '/geo-domains', keyword: '/keyword-domains',
  pattern: '/pattern-domains', brandable: '/brandable-domains',
  numeric: '/numeric-domains', suggestor: '/domain-suggestor',
  wordlist: '/wordlist-combiner', analyzer: '/smart-analyzer',
  emailtool: '/smart-email', bulkcheck: '/bulk-checker',
  extractor: '/domain-extractor', texttools: '/text-tools',
  emailextractor: '/email-extractor', newsdomain: '/domain-news'
};
const REVERSE_ROUTE = Object.fromEntries(Object.entries(ROUTE_MAP).map(([k,v]) => [v,k]));

// SEO meta info per tool
const metaInfo = {
  home: { title: 'AI Domain Generator', desc: 'Generate premium domain names with AI-powered tools. Analyze, export, and manage domain portfolios.' },
  geo: { title: 'Geo Domain Generator | AI Domains', desc: 'Generate location-based domains for local businesses and lead generation using city + service combinations.' },
  keyword: { title: 'Keyword Domain Generator | AI Domains', desc: 'Generate niche-specific domains from keywords and categories with smart prefix and suffix combinations.' },
  pattern: { title: 'Pattern Domain Generator | AI Domains', desc: 'Generate structured brandable domains using advanced CVC/CVVC naming patterns and letter combinations.' },
  brandable: { title: 'Brandable Name Generator | AI Domains', desc: 'Create startup-style brandable domain names optimized for resale and brand recognition.' },
  numeric: { title: 'Numeric Domain Generator | AI Domains', desc: 'Generate valuable numeric domain names for premium investments and brandable number-based brands.' },
  suggestor: { title: 'Domain Suggestor | AI Domains', desc: 'Get AI-driven domain name suggestions based on your keywords, trends, and market data.' },
  wordlist: { title: 'WordList Combiner | AI Domains', desc: 'Combine prefix and suffix word lists to generate unique domain name combinations automatically.' },
  analyzer: { title: 'Smart Domain Analyzer | AI Domains', desc: 'Analyze domains using AI scoring, SEO metrics, CPC data, backlinks, and flip potential evaluation.' },
  emailtool: { title: 'Smart Email Tool | AI Domains', desc: 'Create professional outreach campaigns to contact domain owners with customizable email templates.' },
  bulkcheck: { title: 'Bulk Domain Checker | AI Domains', desc: 'Check availability and SEO metrics for large domain lists instantly with bulk processing.' },
  extractor: { title: 'Domain Extractor | AI Domains', desc: 'Extract domain names from text, URLs, and content for quick domain list building.' },
  texttools: { title: 'Text Tools | AI Domains', desc: 'Powerful text manipulation tools for domain research, content formatting, and data processing.' },
  emailextractor: { title: 'Email Extractor | AI Domains', desc: 'Extract email addresses from text and content for outreach campaign building.' },
  newsdomain: { title: 'Domain News Generator | AI Domains', desc: 'Generate domain market news and insights using AI-powered analysis of trends and sales.' }
};

function updateSEOMeta(tool) {
  const info = metaInfo[tool] || metaInfo.home;
  const url = ROUTE_MAP[tool] || '/';
  document.title = info.title;
  let desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', info.desc);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', location.origin + url);
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', info.title);
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', info.desc);
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', location.origin + url);
}

// Tools that show filter controls
const toolsWithFilters = ['geo', 'keyword', 'pattern', 'brandable', 'numeric', 'suggestor', 'wordlist', 'newsdomain'];

// ==================== LETTER GRIDS ====================
function buildLetterGrid(container, letters, selected, type) {
  container.innerHTML = '';
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn' + (selected.includes(l) ? ' selected' : '');
    btn.textContent = l.toUpperCase();
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      if (type === 'C') {
        if (btn.classList.contains('selected') && !genState.selectedConsonants.includes(l)) genState.selectedConsonants.push(l);
        else genState.selectedConsonants = genState.selectedConsonants.filter(x => x !== l);
      } else {
        if (btn.classList.contains('selected') && !genState.selectedVowels.includes(l)) genState.selectedVowels.push(l);
        else genState.selectedVowels = genState.selectedVowels.filter(x => x !== l);
      }
    });
    container.appendChild(btn);
  });
}

// ==================== STATE MANAGEMENT ====================
function saveToolInputs(tool) {
  if (!tool || tool === 'home' || tool === 'analyzer') return;
  const panel = $(`#${tool}-panel`);
  if (!panel) return;
  const data = {};
  panel.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => { if (el.id) data[el.id] = el.value; });
  panel.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => { if (el.id) data[el.id] = el.checked; });
  panel.querySelectorAll('.custom-select').forEach(el => { if (el.id) data[el.id] = getSelectValue(el.id); });
  if (tool === 'pattern') {
    data.patC = genState.selectedConsonants;
    data.patV = genState.selectedVowels;
  }
  if (tool === 'numeric') {
     const actBtn = panel.querySelector('.len-btn.active');
     if (actBtn) data.numLen = actBtn.dataset.len;
  }
  try { localStorage.setItem(`tool_inputs_${tool}`, JSON.stringify(data)); } catch(e) {}
}

function restoreToolInputs(tool) {
  if (!tool || tool === 'home' || tool === 'analyzer') return;
  const saved = localStorage.getItem(`tool_inputs_${tool}`);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    Object.entries(data).forEach(([id, val]) => {
      if (id === 'patC') { genState.selectedConsonants = val; return; }
      if (id === 'patV') { genState.selectedVowels = val; return; }
      if (id === 'numLen') {
         $$('.len-btn').forEach(b => b.classList.toggle('active', b.dataset.len === val));
         return;
      }
      const el = $(`#${id}`);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = val;
      else if (el.classList.contains('custom-select')) {
         const opt = el.querySelector(`.select-option[data-value="${val}"]`);
         if (opt) {
           el.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
           opt.classList.add('active');
           const trigger = el.querySelector('.selected-text');
           if (trigger) trigger.textContent = opt.textContent;
         }
      } else {
         el.value = val;
      }
    });
  } catch(e) {}
}

function saveToolDomains(tool, domains) {
  if (!tool || tool === 'home') return;
  try { localStorage.setItem(`tool_domains_${tool}`, JSON.stringify(domains)); } catch(e) {}
}

function autoCleanupCache() {
  try {
    const lastCleanup = localStorage.getItem('lastCacheCleanup');
    const now = Date.now();
    // 24 hours = 86400000 ms
    if (!lastCleanup || now - parseInt(lastCleanup) > 86400000) {
      // Cleanup all tool domains and inputs
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tool_domains_') || key.startsWith('tool_inputs_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('lastCacheCleanup', now.toString());
      console.log('Auto-cleanup: Removed old cache');
    }
  } catch(e) {}
}

function saveGlobalFilters() {
  try {
    const filters = {
      sort: getSelectValue('resultsSort'),
      visibility: getSelectValue('domainVisibilityFilter')
    };
    localStorage.setItem('globalFilters', JSON.stringify(filters));
  } catch(e) {}
}

function restoreGlobalFilters() {
  try {
    const saved = localStorage.getItem('globalFilters');
    if (!saved) return;
    const filters = JSON.parse(saved);
    if (filters.sort) {
      const opt = $('#resultsSort')?.querySelector(`.select-option[data-value="${filters.sort}"]`);
      if (opt) {
        $('#resultsSort').querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const trigger = $('#resultsSort').querySelector('.selected-text');
        if (trigger) trigger.textContent = opt.textContent;
        uiState.sort = filters.sort;
      }
    }
    if (filters.visibility) {
      const opt = $('#domainVisibilityFilter')?.querySelector(`.select-option[data-value="${filters.visibility}"]`);
      if (opt) {
        $('#domainVisibilityFilter').querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const trigger = $('#domainVisibilityFilter').querySelector('.selected-text');
        if (trigger) trigger.textContent = filters.visibility === 'available' ? 'Available Only' : 'All Domains';
        const triggerBtn = $('#domainVisibilityFilter').querySelector('.custom-select-trigger');
        if (triggerBtn) triggerBtn.classList.toggle('filter-active', filters.visibility === 'available');
        uiState.visibilityFilter = filters.visibility;
      }
    }
  } catch(e) {}
}

function restoreToolDomains(tool) {
  if (!tool || tool === 'home') return false;
  const saved = localStorage.getItem(`tool_domains_${tool}`);
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.length) {
      state.domains = parsed;
      let title = titles[tool] ? titles[tool] + ' Results' : 'Restored Generated Domains';
      if (tool === 'analyzer' || tool === 'bulkcheck') {
         if (tool === 'analyzer') renderAnalyzerResults(parsed);
         if (tool === 'bulkcheck') renderBulkResults(parsed);
      } else if (tool === 'extractor' || tool === 'emailextractor') {
         // handle extractors if needed
      } else {
         renderResults(parsed, title, copyText);
         syncExportDomains(state.domains, tool);
      }
      return true;
    }
  } catch(e) { }
  return false;
}

// ==================== SEO CONTENT LAZY LOADING & RENDER ====================
let seoConfigsCache = null;

async function fetchSeoConfigs() {
  if (seoConfigsCache) return seoConfigsCache;
  try {
    const res = await fetch('/data/seo-configs.json');
    if (!res.ok) throw new Error('Failed to load SEO configs');
    seoConfigsCache = await res.json();
    return seoConfigsCache;
  } catch (e) {
    console.error('Error fetching SEO configurations:', e);
    return null;
  }
}

function generateClientSeoHtml(toolKey, config, allConfigs) {
  const aboutHtml = config.about.map(p => `<p class="seo-paragraph">${p}</p>`).join('');
  const featuresHtml = config.features.map(f => `
    <li class="seo-feature-item">
      <span class="seo-feature-icon">✓</span>
      <span class="seo-feature-text">${f}</span>
    </li>
  `).join('');
  const faqsHtml = config.faqs.map(faq => `
    <details class="seo-faq-accordion">
      <summary class="seo-faq-question">
        <span>${faq.q}</span>
        <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </summary>
      <div class="seo-faq-answer">
        <p class="seo-paragraph">${faq.a}</p>
      </div>
    </details>
  `).join('');

  const relatedDisplayNames = {
    geo: 'Geo Generator',
    keyword: 'Keyword Generator',
    pattern: 'Pattern Generator',
    brandable: 'Brandable Names',
    numeric: 'Numeric Generator',
    suggestor: 'AI Suggestor',
    wordlist: 'WordList Combiner',
    analyzer: 'Smart Analyzer',
    emailtool: 'Email Outreach',
    bulkcheck: 'Bulk Checker',
    extractor: 'Domain Extractor',
    texttools: 'Text Tools',
    emailextractor: 'Email Extractor',
    newsdomain: 'Domain News'
  };

  const relatedHtml = config.related.map(key => {
    const rConfig = allConfigs[key];
    if (!rConfig) return '';
    return `<a href="${rConfig.path}" class="seo-related-link">${relatedDisplayNames[key]}</a>`;
  }).join('');

  return `
    <div class="seo-card">
      <div class="seo-inner">
        <section class="seo-block seo-about-section">
          <h2 class="seo-h2">About ${config.h1}</h2>
          <div class="seo-about-content">
            ${aboutHtml}
          </div>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-features-section">
          <h2 class="seo-h2">Key Tool Features</h2>
          <ul class="seo-feature-list">
            ${featuresHtml}
          </ul>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-faq-section">
          <h2 class="seo-h2">Frequently Asked Questions</h2>
          <div class="seo-faq-list">
            ${faqsHtml}
          </div>
        </section>

        <div class="seo-divider"></div>

        <section class="seo-block seo-related-section">
          <h2 class="seo-h2">Related Domain Tools</h2>
          <div class="seo-related-grid">
            ${relatedHtml}
          </div>
        </section>
      </div>
    </div>
  `;
}

async function renderSeoContent(toolKey) {
  const seoContainer = $('#seoContentSection');
  if (!seoContainer) return;

  // Unload previous content
  seoContainer.innerHTML = '';
  seoContainer.classList.remove('active');

  // Do not render SEO if we are on 'home' panel
  if (toolKey === 'home') return;

  const configs = await fetchSeoConfigs();
  if (!configs || !configs[toolKey]) return;

  const html = generateClientSeoHtml(toolKey, configs[toolKey], configs);
  seoContainer.innerHTML = `
    <div id="seo-content-${toolKey}" class="seo-tool-content active">
      ${html}
    </div>
  `;
  seoContainer.classList.add('active');
}

// ==================== NAVIGATION ====================
function switchTool(tool, updateHistory = true) {
  if (state.activeTool && state.activeTool !== tool) {
     saveToolInputs(state.activeTool);
  }
  
  if (state.activeTool !== tool) {
    if (!restoreToolDomains(tool)) {
      clearResults();
    }
  }
  state.activeTool = tool;
  localStorage.setItem('activeTool', tool);
  
  restoreToolInputs(tool);
  
  if (updateHistory) {
    const newUrl = ROUTE_MAP[tool] || '/';
    window.history.pushState({ tool }, '', newUrl);
  }
  
  updateSEOMeta(tool);
  
  // Update active SEO content block (lazy-loads and overwrites)
  renderSeoContent(tool);
  
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tool === tool));
  $$('.tool-panel').forEach(p => {
    const isActive = p.id === tool + '-panel';
    p.classList.toggle('active', isActive);
  });
  const nt = $('#navbarTitle');
  if (nt) nt.textContent = titles[tool] || 'AI Domain Generator';
  
  // Show/hide results section based on tool
  const resultsSection = $('#resultsSection');
  const resultsTitle = $('#resultsTitle');
  if (resultsSection) {
    if (tool === 'emailtool' || tool === 'texttools') {
      resultsSection.classList.remove('visible');
    } else {
      resultsSection.classList.add('visible');
      // Set appropriate title based on tool type
      if (resultsTitle) {
        if (tool === 'analyzer') {
          resultsTitle.textContent = 'Analysis Results';
        } else if (tool === 'bulkcheck') {
          resultsTitle.textContent = 'Bulk Check Results';
        } else if (tool === 'extractor' || tool === 'emailextractor') {
          resultsTitle.textContent = tool === 'extractor' ? 'Extracted Domains' : 'Extracted Emails';
        } else {
          resultsTitle.textContent = 'Generated Domains';
        }
      }
    }
  }
  
  // Always show navbar title (home panel no longer exists in sidebar)
  
  showFilterControls(toolsWithFilters.includes(tool));
  
  if (window.updateExportButton) {
    window.updateExportButton();
  }
}

// ==================== GENERATION HANDLERS ====================
function handleGenerate(type) {
  const btn = event.currentTarget;
  setButtonState(btn, true);
  showLoading(true);

  setTimeout(() => {
    try {
      let domains = [];
      switch (type) {
        case 'geo': {
          const kw = sanitizeInput($('#geoKeyword').value.trim());
          const custom = sanitizeInput($('#geoCustom').value.trim());
          domains = generateGeo({
            keyword: kw, custom,
            locationType: getSelectValue('geoLocationType') || 'us-cities',
            sortBy: getSelectValue('geoSortBy') || 'population',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'keyword': {
          const input = sanitizeInput($('#kwInput').value.trim());
          if (!input) { toast('Enter at least one keyword'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateKeyword({
            keywords: input.split(',').map(k => k.trim()).filter(k => k),
            category: getSelectValue('kwNicheSelect') || '💻 Tech',
            position: getSelectValue('kwPositionSelect') || 'suffix',
            sortBy: getSelectValue('kwSortSelect') || 'length',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'pattern': {
          const rawPat = ($('#patternInput').value || '').trim();
          // Collect batch patterns
          const batchRaw = ($('#patternBatch')?.value || '').trim();
          const patterns = batchRaw
            ? batchRaw.split('\n').map(p => p.trim()).filter(p => p)
            : [rawPat];
          // Validate all patterns
          for (const p of patterns) {
            const v = validatePattern(p);
            if (!v.valid) { toast('Pattern error: ' + v.error); setButtonState(btn, false); showLoading(false); return; }
          }
          const patCount = parseInt(getSelectValue('patternCount') || '100');
          domains = generatePattern({
            patterns,
            tld: getSelectValue('patternTld') || '.com',
            limit: patCount, smartMode: state.smartMode
          });
          break;
        }
        case 'brandable': {
          domains = generateBrandable({
            base: sanitizeInput($('#brandInput').value.trim()),
            maxLen: parseInt($('#brandLength').value) || 10,
            usePrefix: $('#brPrefix').checked,
            useSuffix: $('#brSuffix').checked,
            useBoth: $('#brBoth').checked,
            useRandom: $('#brRandom').checked,
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'numeric': {
          const lenBtn = $('.len-btn.active');
          domains = generateNumeric({
            keyword: sanitizeInput($('#numKeyword').value.trim()),
            numPattern: getSelectValue('numPattern') || 'random',
            numLen: lenBtn ? parseInt(lenBtn.dataset.len) : 4,
            pure: $('#numPure').checked,
            hybrid: $('#numHybrid').checked,
            reverse: $('#numReverse').checked,
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'suggestor': {
          const input = sanitizeInput($('#suggestInput').value.trim());
          if (!input) { toast('Describe your business'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateSuggestor({
            input,
            limit: parseInt(getSelectValue('suggestMax') || state.limit),
            smartMode: state.smartMode
          });
          break;
        }
        case 'wordlist': {
          const listA = $('#wordListA').value.trim().split('\n').map(w => w.trim()).filter(w => w);
          const listB = $('#wordListB').value.trim().split('\n').map(w => w.trim()).filter(w => w);
          if (!listA.length || !listB.length) { toast('Enter words in both lists'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateWordlist({
            listA, listB,
            separator: getSelectValue('wordlistSep') || '',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
      }

      state.domains = domains;
      state.domains.forEach(d => { if (d.available === undefined) d.available = 'checking'; });
      saveToolInputs(type);
      renderResults(domains, titles[type] + ' Results', copyText);

      // Run real availability check
      runAvailabilityCheck(state.domains, updateResultsGridUI);
    } catch (e) {
      console.error('Generation error:', e);
      if (e.message && e.message.includes('SMART mode requires')) {
         toast('Error: ' + e.message);
         // Fallback rendering
         renderResults([], titles[type] + ' Results', copyText);
      } else {
         toast('Generation failed: ' + (e.message || 'Unknown error'));
         renderResults([], titles[type] + ' Results', copyText);
      }
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 300);
}

// ==================== REAL AVAILABILITY CHECK (after generation) ====================
function updateExportState() {
  if (window.updateExportButton) {
    window.updateExportButton();
  }
}

function toggleGenerateButtons(disabled) {
  const buttons = document.querySelectorAll('.btn-generate, #btnKwGenerate, #btnPatternGenerate, #btnGenDomains, #btnBulkCheck, #btnAnalyze, #btnExtract, #btnExtractEmail');
  buttons.forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.pointerEvents = disabled ? 'none' : '';
  });
}

async function runAvailabilityCheck(domainsArray, updateFn) {
  if (!domainsArray || !domainsArray.length) {
    state.isChecking = false;
    updateExportState();
    return;
  }

  state.isChecking = true;
  updateExportState();
  toggleGenerateButtons(true);
  showAvailabilityProgress(0, domainsArray.length, true);

  try {
    const resultsMap = await bulkCheckDomains(domainsArray, {
      useCache: true,
      onProgress: (checked, total, batchResults) => {
        showAvailabilityProgress(checked, total, true);
        if (batchResults) {
          applyResultsToData(domainsArray, batchResults);
          if (updateFn) {
            updateFn(batchResults);
          } else {
            applyFilterSort(state.domains, copyText);
          }
          updateDomainCounter(state.domains);
        }
      }
    });

    state.isChecking = false;
    showAvailabilityProgress(domainsArray.length, domainsArray.length, false);
    applyResultsToData(domainsArray, resultsMap);

    if (state.activeTool === 'analyzer') {
      renderAnalyzerResults(state.domains);
    } else if (state.activeTool === 'bulkcheck') {
      renderBulkResults(state.domains);
    } else {
      applyFilterSort(state.domains, copyText);
    }
    updateDomainCounter(state.domains);

    const hasIncomplete = domainsArray.some(d =>
      d.available === 'checking' ||
      d.available === 'error' ||
      d.available === 'unknown' ||
      d.available === null
    );

    if (hasIncomplete) {
      const failedCount = domainsArray.filter(d =>
        d.available === 'error' ||
        d.available === 'unknown' ||
        d.available === null
      ).length;
      showAvailabilityErrorBanner(true);
      toast(`Availability check incomplete: ${failedCount} checks failed.`);
    } else {
      showAvailabilityErrorBanner(false);
      saveToolDomains(state.activeTool, state.domains);
      domainsArray.forEach(d => {
        const dName = d.name || d.domain;
        if (dName && d.available !== undefined) {
          setCachedAvailability(dName, d.available);
        }
      });
      toast('Availability checks completed and saved.');
    }

    updateExportState();

  } catch (err) {
    console.error('Availability check error:', err);
    state.isChecking = false;
    showAvailabilityProgress(0, domainsArray.length, false);
    showAvailabilityErrorBanner(true);
    updateExportState();
  } finally {
    toggleGenerateButtons(false);
  }
}

async function retryFailedChecks() {
  if (state.isChecking) return;
  
  const domainsToRetry = state.domains.filter(d =>
    d.available === 'checking' ||
    d.available === 'error' ||
    d.available === 'unknown' ||
    d.available === null
  );

  if (!domainsToRetry.length) return;

  toast(`Retrying ${domainsToRetry.length} failed availability checks...`);
  domainsToRetry.forEach(d => d.available = 'checking');
  
  if (state.activeTool === 'analyzer') {
    renderAnalyzerResults(state.domains);
  } else if (state.activeTool === 'bulkcheck') {
    renderBulkResults(state.domains);
  } else {
    applyFilterSort(state.domains, copyText);
  }

  await runAvailabilityCheck(domainsToRetry, (resultsMap) => {
    if (state.activeTool === 'analyzer') {
      updateAnalyzerUI(resultsMap);
    } else if (state.activeTool === 'bulkcheck') {
      updateBulkResultsUI(resultsMap);
    } else {
      updateResultsGridUI(resultsMap);
    }
  });
}

async function retrySingleCheck(domainName) {
  if (state.isChecking) return;

  const domainObj = state.domains.find(d => (d.name || d.domain) === domainName);
  if (!domainObj) return;

  toast(`Retrying check for ${domainName}...`);
  domainObj.available = 'checking';
  
  if (state.activeTool === 'analyzer') {
    renderAnalyzerResults(state.domains);
  } else if (state.activeTool === 'bulkcheck') {
    renderBulkResults(state.domains);
  } else {
    applyFilterSort(state.domains, copyText);
  }

  await runAvailabilityCheck([domainObj], (resultsMap) => {
    if (state.activeTool === 'analyzer') {
      updateAnalyzerUI(resultsMap);
    } else if (state.activeTool === 'bulkcheck') {
      updateBulkResultsUI(resultsMap);
    } else {
      updateResultsGridUI(resultsMap);
    }
  });
}

// Global retry event listeners
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnRetryAllFailed') {
    retryFailedChecks();
  }
});

document.addEventListener('retry-domain-check', e => {
  const { domain } = e.detail;
  if (domain) {
    retrySingleCheck(domain);
  }
});

// ==================== GEN DOMAIN NEWS HANDLER ====================
async function handleGenDomains() {
  const btn = $('#btnGenDomains');
  setButtonState(btn, true);
  showLoading(true);

  try {
    const apiKeys = loadAllApiKeys();

    if (!apiKeys.gemini && !apiKeys.grok) {
      toast('Please add API keys in settings');
      setButtonState(btn, false); showLoading(false); return;
    }

    clearCache();

    const result = await generateDomainNews({
      apiKeys,
      timeRange:  getSelectValue('genNewsTimeRange') || 'week',
      tld:        getSelectValue('genNewsTld') || '.com',
      maxWords:   parseInt(getSelectValue('genNewsMaxWords') || '2'),
      count:      parseInt(getSelectValue('genNewsCount') || '10'),
      query:      $('#genNewsQuery')?.value.trim() || '',
      mode:       genNewsState.mode,
      aiProvider: genNewsState.aiProvider,
      forceRefresh: true
    });

    const { domains, sources, errors, meta } = result;

    if (sources.length) toast('News from: ' + sources.join(', ') + ' — ' + domains.length + ' domains');
    else if (meta.articlesCount === 0) toast('No news APIs active — using keyword fallback');

    if (!domains.length) {
      const reason = errors[0]?.reason || 'No domains generated';
      toast(reason.length > 80 ? reason.slice(0, 80) + '...' : reason);
      showLoading(false); setButtonState(btn, false); return;
    }

    state.domains = domains;
    state.domains.forEach(d => { if (d.available === undefined) d.available = 'checking'; });
    
    saveToolInputs('newsdomain');
    renderResults(domains, 'Gen Domain News (' + genNewsState.mode + ' / ' + genNewsState.aiProvider.toUpperCase() + ') Results', copyText);

    runAvailabilityCheck(state.domains, updateResultsGridUI);

  } catch (err) {
    console.error('Gen Domain News error:', err);
    const msg = err.message || '';
    let userMsg;
    if (msg.includes('daily') || msg.includes('tomorrow') || msg.includes('billing')) {
      userMsg = 'Daily quota exhausted — resets at midnight or add billing at ai.google.dev';
    } else if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      userMsg = 'Rate limit reached — please wait a minute and try again';
    } else if (msg.includes('Invalid') || msg.includes('API key')) {
      userMsg = msg;
    } else {
      userMsg = 'Generation failed: ' + (msg || 'unknown error');
    }
    toast(userMsg);
    renderResults([], 'Gen Domain News Results', copyText);
  } finally {
    setButtonState(btn, false);
    showLoading(false);
  }
}

// ==================== BULK CHECKER ====================
async function handleBulkCheck() {
  const btn = $('#btnBulkCheck');
  setButtonState(btn, true);
  const input = $('#bulkInput').value.trim();
  if (!input) { toast('Enter domains to check'); setButtonState(btn, false); return; }

  const lines = input.split('\n').map(l => l.trim()).filter(l => l);
  if (!lines.length) { toast('No valid domains'); setButtonState(btn, false); return; }

  showLoading(true);

  try {
    const domains = lines.map(d => ({
      name: d.includes('.') ? d : d + '.com',
      available: 'checking'
    }));
    state.domains = domains;
    saveToolInputs('bulkcheck');
    renderBulkResults(domains);

    await runAvailabilityCheck(state.domains, updateBulkResultsUI);
  } catch (e) {
    console.error('Bulk check error:', e);
    toast('Check failed — some results may be unavailable');
  } finally {
    setButtonState(btn, false);
    showLoading(false);
  }
}

// ==================== DOMAIN EXTRACTOR ====================
function handleExtract() {
  const btn = $('#btnExtract');
  setButtonState(btn, true);
  const input = $('#extractInput').value.trim();
  if (!input) { toast('Paste text to extract from'); setButtonState(btn, false); return; }

  showLoading(true);
  setTimeout(() => {
    try {
      const regex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})/g;
      const found = new Set(); let m;
      while ((m = regex.exec(input)) !== null) found.add(m[1].toLowerCase());
      const domains = [...found];
      state.domains = domains;
      renderExtractedResults(domains, 'domain', function (btn) { copyText(domains.join('\n'), btn); });
    } catch (e) {
      console.error('Extract error:', e);
      toast('Extraction failed');
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 400);
}

// ==================== SMART DOMAIN ANALYZER ====================
let analyzerData = { mode: 'basic', domains: [], rawInput: '', csvData: '' };

// Example CSV data for "Paste Example" button
const EXAMPLE_PASTE = `google.com
apple.com
microsoft.com
myawesomestartup.com
cloudplatform.io
airevolution.tech
smartdata.dev`;

const EXAMPLE_CSV = `Domain,LE,BL,DP,CPC,TF,CF,WBY,ABY,SG,dropped,acr
google.com,6,950000000,950000000,45,95,95,1997,1996,9900000,0,50000
apple.com,5,820000000,800000000,40,92,93,1987,1987,8500000,0,45000
microsoft.com,9,780000000,750000000,38,90,92,1991,1991,7200000,0,40000
cloudplatform.io,13,12000,8500,15,25,22,2018,2018,5400,1,150
airevolution.tech,12,5200,3800,22,18,15,2020,2020,2100,0,80
myawesomestartup.com,17,250,180,5,8,6,2023,2023,320,2,25`;

// Tab switching (only for domain analyzer, not email tool)
function initAnalyzerTabs() {
  $$('.analyzer-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.analyzer-tab[data-tab]').forEach(t => t.classList.remove('active'));
      $$('.analyzer-tab-content').forEach(c => {
        if (c.closest('#analyzer-panel')) c.classList.remove('active');
      });
      tab.classList.add('active');
      const target = $(`#tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

// CSV Upload handling
function initCSVUpload() {
  const dropZone = $('#csvDropZone');
  const fileInput = $('#csvFileInput');
  const fileInfo = $('#csvFileInfo');
  const fileNameEl = $('#csvFileName');
  const rowCountEl = $('#csvRowCount');

  if (!dropZone || !fileInput) return;

  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());

  // File selected
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleCSVFile(e.target.files[0]);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleCSVFile(e.dataTransfer.files[0]);
  });

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      analyzerData.csvData = text;
      analyzerData.rawInput = text;

      // Show file info
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      dropZone.style.display = 'none';
      fileInfo.style.display = 'flex';
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (rowCountEl) rowCountEl.textContent = (lines.length - 1) + ' rows';

      // Auto-analyze
      handleAnalyze();
    };
    reader.readAsText(file);
  }
}

function handleAnalyze() {
  const btn = $('#btnAnalyze');
  let input = '';

  // Determine input source
  if (analyzerData.csvData) {
    input = analyzerData.csvData;
  } else {
    input = ($('#analyzerInput')?.value || '').trim();
  }

  if (!input) { toast('Paste domains or upload a CSV file to analyze'); return; }

  setButtonState(btn, true);
  analyzerData.rawInput = input;

  setTimeout(() => {
    try {
      const result = analyzeDomains(input, state.smartMode);
      analyzerData.mode = result.mode;
      analyzerData.domains = result.domains;

      // Show cleaning stats if available
      const stats = result.parseStats;
      if (stats && stats.totalRows > 0) {
        if (stats.skippedRows > 0 && stats.totalRows > 1) {
          toast(`CSV cleaned: ${stats.validRows} domains from ${stats.totalRows} rows (${stats.skippedRows} skipped)`);
        } else if (stats.validRows === 0) {
          toast('No valid domains detected in the CSV');
        }
      }

      // Show mode indicator
      updateModeIndicator();

      // Show/hide advanced filters
      const filtersEl = $('#analyzerFilters');
      if (filtersEl) filtersEl.style.display = result.mode === 'advanced' ? 'flex' : 'none';

      applyAnalyzerFilters();

      // Run real availability check for domains without pre-existing status
      const domainsToCheck = analyzerData.domains.filter(d => d.available === 'checking' || d.available === null);
      if (domainsToCheck.length > 0) {
        runAvailabilityCheck(domainsToCheck, (batchResults) => {
          // Apply to full data set too
          applyResultsToData(analyzerData.domains, batchResults);
          if (window.analysisResults) applyResultsToData(window.analysisResults, batchResults);
          updateAnalyzerUI(batchResults);
        });
      }
    } catch (e) {
      console.error('Analyze error:', e);
      toast('Analysis failed');
    } finally {
      setButtonState(btn, false);
    }
  }, 300);
}

function updateModeIndicator() {
  const indicator = $('#analyzerModeIndicator');
  const badge = $('#analyzerModeBadge');
  const count = $('#analyzerDomainCount');
  if (!indicator || !badge) return;

  indicator.style.display = 'flex';
  const isAdvanced = analyzerData.mode === 'advanced';
  badge.className = `mode-badge ${isAdvanced ? 'mode-badge-advanced' : 'mode-badge-basic'}`;
  badge.textContent = isAdvanced ? '🔴 Advanced Analysis' : '🟢 Basic Mode';
  if (count) count.textContent = analyzerData.domains.length + ' domains detected';
}

function applyAnalyzerFilters() {
  const filters = {
    availableOnly: $('#filterAvailable')?.checked || false,
    minCpc: parseFloat($('#filterMinCpc')?.value || 0),
    minAge: parseFloat($('#filterMinAge')?.value || 0),
    minScore: parseFloat($('#filterMinScore')?.value || 0),
    classification: getSelectValue('analyzerClassFilter') || 'all'
  };

  let filtered = filterDomains(analyzerData.domains, analyzerData.mode, filters);

  // Store total for filtered count display
  window._analyzerTotal = analyzerData.domains.length;

  // Apply sort
  const sort = getSelectValue('analyzerSort') || 'score';
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'cpc') filtered.sort((a, b) => (b.metrics?.cpc || 0) - (a.metrics?.cpc || 0));
  else if (sort === 'age') filtered.sort((a, b) => (b.metrics?.age || 0) - (a.metrics?.age || 0));
  else if (analyzerData.mode === 'advanced') filtered.sort((a, b) => (b.scores?.final || 0) - (a.scores?.final || 0));

  state.domains = filtered;
  window.analysisResults = filtered;
  
  const isCheckingOrUnknown = state.isChecking || filtered.some(d => 
    d.available === 'checking' || 
    d.available === 'error' || 
    d.available === 'unknown' || 
    d.available === null
  );
  
  if (!isCheckingOrUnknown) {
    saveToolDomains('analyzer', filtered);
  }
  
  saveToolInputs('analyzer');
  renderAnalyzerResults(filtered);
  syncExportDomains(state.domains, 'analyzer');
}


// ==================== TEXT TOOLS ====================
function initTextTools() {
  $$('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $('#textInput').value;
      if (!input) return;
      const action = btn.dataset.action;
      let output = '';
      switch (action) {
        case 'lowercase': output = input.toLowerCase(); break;
        case 'uppercase': output = input.toUpperCase(); break;
        case 'titlecase': output = input.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()); break;
        case 'nospace': output = input.replace(/\s+/g, ''); break;
        case 'slug': output = input.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, ''); break;
        case 'reverse': output = input.split('').reverse().join(''); break;
        case 'camelCase': output = input.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()); break;
        case 'kebab-case': output = input.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, ''); break;
      }
      $('#textOutput').value = output;
      const copyBtn = $('#btnCopyText');
      if (copyBtn) copyBtn.style.display = 'flex';
      toast('Transformed: ' + action);
    });
  });

  const copyBtn = $('#btnCopyText');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const out = $('#textOutput').value;
      if (out) copyText(out, copyBtn);
    });
  }
}

// ==================== EMAIL EXTRACTOR ====================
function handleExtractEmails() {
  const btn = $('#btnExtractEmail');
  setButtonState(btn, true);
  const input = $('#emailInput').value.trim();
  if (!input) { toast('Paste text containing emails'); setButtonState(btn, false); return; }

  showLoading(true);
  setTimeout(() => {
    try {
      const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const found = new Set(); let m;
      while ((m = regex.exec(input)) !== null) found.add(m[0].toLowerCase());
      const emails = [...found];
      state.domains = emails;
      renderExtractedResults(emails, 'email', function (b) { copyText(emails.join('\n'), b); });
    } catch (e) {
      console.error('Email extract error:', e);
      toast('Extraction failed');
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 400);
}

// ==================== SMART EMAIL TOOL INIT ====================
let emailSubjectCount = 1;
let emailMsgCount = 1;

function initEmailTool() {
  // Listen for campaign selection
  document.addEventListener('campaign-selected', (e) => {
    const id = e.detail.id;
    if (!id) return;
    const campaign = window.campaignManager.getCampaignById(id);
    if (!campaign) return;

    // ── Step 1: Pre-fill emails from campaign ──
    const emailPasteTA = $('#emailPasteInput');
    if (campaign.emails && campaign.emails.length > 0) {
      emailState.contacts = JSON.parse(JSON.stringify(campaign.emails));
      if (emailPasteTA) emailPasteTA.value = ''; // We rely on the internal array, no need to clutter paste area if it's already structured
    } else {
      emailState.contacts = [];
      if (emailPasteTA) emailPasteTA.value = '';
    }
    updateEmailContactSummary();
    updateEmailTable();
    updateEmailStats();

    // ── Step 2: Load subject lines ──
    const subjContainer = $('#subjectVariations');
    if (subjContainer) {
      subjContainer.innerHTML = '';
      emailSubjectCount = 0;
      (campaign.subjects || []).forEach(subj => {
        emailSubjectCount++;
        const div = document.createElement('div');
        div.className = 'email-var-input';
        div.innerHTML = `<input type="text" class="email-var-field" id="subjectInput${emailSubjectCount}" value="${escapeHtml(subj)}" placeholder="Subject variation ${emailSubjectCount}" />
          ${emailSubjectCount > 1 ? `<button class="btn-action-sm email-remove-var" style="flex-shrink:0;margin-top:4px">
            <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>` : ''}`;
        subjContainer.appendChild(div);
        if (emailSubjectCount > 1) {
          div.querySelector('.email-remove-var').addEventListener('click', () => { div.remove(); updatePreview(); });
        }
        div.querySelector('input').addEventListener('input', debounce(updatePreview, 300));
      });
      if (emailSubjectCount === 0) {
        emailSubjectCount = 1;
        subjContainer.innerHTML = `<div class="email-var-input"><input type="text" class="email-var-field" id="subjectInput1" placeholder="e.g. Quick question about {{domain}}" /></div>`;
        subjContainer.querySelector('input').addEventListener('input', debounce(updatePreview, 300));
      }
    }

    // ── Step 3: Load message bodies ──
    const msgContainer = $('#messageVariations');
    if (msgContainer) {
      msgContainer.innerHTML = '';
      emailMsgCount = 0;
      (campaign.messages || []).forEach(msg => {
        emailMsgCount++;
        const div = document.createElement('div');
        div.className = 'email-var-input';
        div.innerHTML = `<textarea class="email-msg-field" id="messageInput${emailMsgCount}" rows="5" placeholder="Message variation ${emailMsgCount}">${escapeHtml(msg)}</textarea>
          ${emailMsgCount > 1 ? `<button class="btn-action-sm email-remove-var" style="flex-shrink:0;margin-top:4px">
            <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>` : ''}`;
        msgContainer.appendChild(div);
        if (emailMsgCount > 1) {
          div.querySelector('.email-remove-var').addEventListener('click', () => { div.remove(); updatePreview(); });
        }
        div.querySelector('textarea').addEventListener('input', debounce(updatePreview, 300));
      });
      if (emailMsgCount === 0) {
        emailMsgCount = 1;
        msgContainer.innerHTML = `<div class="email-var-input"><textarea class="email-msg-field" id="messageInput1" rows="5" placeholder="Hi {{name}},..."></textarea></div>`;
        msgContainer.querySelector('textarea').addEventListener('input', debounce(updatePreview, 300));
      }
    }

    updatePreview();
  });

  // Tabs
  $$('.analyzer-tab[data-etab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const parent = tab.closest('.email-section') || tab.closest('.email-tabs');
      if (!parent) return;
      const section = tab.closest('.email-section');
      $$(section ? '.email-section .analyzer-tab' : '.analyzer-tab[data-etab]').forEach(t => {
        if (t.closest('.email-section') === section || (!section && t.dataset.etab)) t.classList.remove('active');
      });
      tab.classList.add('active');
      const targetId = 'tab-' + tab.dataset.etab;
      $$('.analyzer-tab-content').forEach(c => {
        if (c.id === targetId || (c.closest('.email-section') === section)) c.classList.remove('active');
      });
      const target = $(`#${targetId}`);
      if (target) target.classList.add('active');
    });
  });

  // CSV Upload for email
  const eDropZone = $('#emailDropZone');
  const eFileInput = $('#emailFileInput');
  const eFileInfo = $('#emailFileInfo');
  const eFileName = $('#emailFileName');
  const eRowCount = $('#emailRowCount');
  const eRemoveBtn = $('#emailRemoveBtn');

  if (eDropZone && eFileInput) {
    eDropZone.addEventListener('click', () => eFileInput.click());
    eFileInput.addEventListener('change', e => {
      if (e.target.files.length) handleEmailFile(e.target.files[0]);
    });
    eDropZone.addEventListener('dragover', ev => { ev.preventDefault(); eDropZone.classList.add('drag-over'); });
    eDropZone.addEventListener('dragleave', () => eDropZone.classList.remove('drag-over'));
    eDropZone.addEventListener('drop', ev => {
      ev.preventDefault();
      eDropZone.classList.remove('drag-over');
      if (ev.dataTransfer.files.length) handleEmailFile(ev.dataTransfer.files[0]);
    });
  }

  function handleEmailFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const contacts = parseCSVText(text);
      processEmailContacts(contacts);
      if (eFileInfo) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        eDropZone.style.display = 'none';
        eFileInfo.style.display = 'flex';
        if (eFileName) eFileName.textContent = file.name;
        if (eRowCount) eRowCount.textContent = contacts.length + ' contacts';
      }
    };
    reader.readAsText(file);
  }

  if (eRemoveBtn) {
    eRemoveBtn.addEventListener('click', () => {
      emailState.contacts = [];
      emailState.campaign.pending = 0;
      if (eDropZone) eDropZone.style.display = '';
      if (eFileInfo) eFileInfo.style.display = 'none';
      if (eFileInput) eFileInput.value = '';
      updateEmailContactSummary();
      updateEmailTable();
      updateEmailStats();
    });
  }

  // Clear emails button
  const btnClearEmails = $('#btnClearEmails');
  if (btnClearEmails) btnClearEmails.addEventListener('click', () => {
    const ta = $('#emailPasteInput');
    if (ta) ta.value = '';
  });

  // Paste input — parse on change
  const emailPaste = $('#emailPasteInput');
  if (emailPaste) {
    emailPaste.addEventListener('input', debounce(() => {
      const text = emailPaste.value.trim();
      if (!text) {
        emailState.contacts = [];
        updateEmailContactSummary();
        updateEmailTable();
        updateEmailStats();
        return;
      }
      const contacts = parsePastedEmails(text);
      processEmailContacts(contacts);
    }, 500));
  }

  // Clear contacts
  const btnClearContacts = $('#btnClearContacts');
  if (btnClearContacts) btnClearContacts.addEventListener('click', () => {
    emailState.contacts = [];
    const ta = $('#emailPasteInput');
    if (ta) ta.value = '';
    if (eDropZone) eDropZone.style.display = '';
    if (eFileInfo) eFileInfo.style.display = 'none';
    updateEmailContactSummary();
    updateEmailTable();
    updateEmailStats();
  });

  // Add subject variation
  const btnAddSubject = $('#btnAddSubject');
  if (btnAddSubject) btnAddSubject.addEventListener('click', () => {
    emailSubjectCount++;
    const container = $('#subjectVariations');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'email-var-input';
    div.innerHTML = `<input type="text" class="email-var-field" id="subjectInput${emailSubjectCount}" placeholder="Subject variation ${emailSubjectCount}" />
      <button class="btn-action-sm email-remove-var" data-target="subjectInput${emailSubjectCount}" style="flex-shrink:0;margin-top:4px">
        <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;
    container.appendChild(div);
    div.querySelector('.email-remove-var').addEventListener('click', () => {
      div.remove();
      updatePreview();
    });
    div.querySelector('input').addEventListener('input', debounce(updatePreview, 300));
    updatePreview();
  });

  // Add message variation
  const btnAddMessage = $('#btnAddMessage');
  if (btnAddMessage) btnAddMessage.addEventListener('click', () => {
    emailMsgCount++;
    const container = $('#messageVariations');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'email-var-input';
    div.innerHTML = `<textarea class="email-msg-field" id="messageInput${emailMsgCount}" rows="4" placeholder="Message variation ${emailMsgCount}"></textarea>
      <button class="btn-action-sm email-remove-var" data-target="messageInput${emailMsgCount}" style="flex-shrink:0;margin-top:4px">
        <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;
    container.appendChild(div);
    div.querySelector('.email-remove-var').addEventListener('click', () => {
      div.remove();
      updatePreview();
    });
    div.querySelector('textarea').addEventListener('input', debounce(updatePreview, 300));
    updatePreview();
  });

  // Variable chips — insert into active textarea
  $$('.var-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Find the focused or last active message textarea
      let ta = document.activeElement;
      if (!ta || !ta.classList.contains('email-msg-field')) {
        ta = $('#messageInput1') || $('.email-msg-field');
      }
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const variable = chip.dataset.var;
        ta.value = text.substring(0, start) + variable + text.substring(end);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + variable.length;
        updatePreview();
      }
    });
  });

  // First subject/message input listeners
  const subj1 = $('#subjectInput1');
  if (subj1) subj1.addEventListener('input', debounce(updatePreview, 300));
  const msg1 = $('#messageInput1');
  if (msg1) msg1.addEventListener('input', debounce(updatePreview, 300));

  // Anti-spam toggle
  const antiSpam = $('#antiSpamToggle');
  if (antiSpam) antiSpam.addEventListener('change', () => {
    emailState.antiSpam = antiSpam.checked;
  });

  // Timing buttons
  $$('.timing-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.timing-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      emailState.timing = btn.dataset.speed;
    });
  });

  // Campaign buttons
  const btnStart = $('#btnStartCampaign');
  const btnPause = $('#btnPauseCampaign');
  const btnResume = $('#btnResumeCampaign');
  const btnStop = $('#btnStopCampaign');
  const extraBtns = $('.campaign-extra-btns');

  if (btnStart) btnStart.addEventListener('click', async () => {
    const campaignId = window.campaignManager.getActiveCampaignId();
    if (!campaignId) {
      toast('Please select a campaign first');
      return;
    }
    const campaign = window.campaignManager.getCampaignById(campaignId);

    // Collect current subjects and messages from UI
    collectEmailInputs();
    if (!emailState.subjects.length) { toast('Add at least one subject line'); return; }
    if (!emailState.messages.length) { toast('Add at least one message'); return; }
    if (!emailState.contacts.length) { toast('Add email contacts first'); return; }

    const useAntiSpam = $('#antiSpamToggle')?.checked ?? emailState.antiSpam;
    const pendingContacts = emailState.contacts.filter(c => c.status !== 'sent');

    if (!pendingContacts.length) {
      toast('No new emails to send');
      return;
    }

    let opened = 0;
    
    // Disable button to prevent multi-clicks
    btnStart.disabled = true;
    const origText = btnStart.innerHTML;
    
    let delayMs = emailState.timing === 'safe' ? 20000 : emailState.timing === 'fast' ? 5000 : 10000;
    
    pendingContacts.forEach((contact, i) => {
      setTimeout(() => {
        btnStart.innerHTML = `Sending... (${i+1}/${pendingContacts.length})`;
        
        let subject, message;

        if (useAntiSpam) {
          subject = emailState.subjects[Math.floor(Math.random() * emailState.subjects.length)];
          message = emailState.messages[Math.floor(Math.random() * emailState.messages.length)];
        } else {
          subject = emailState.subjects[i % emailState.subjects.length];
          message = emailState.messages[i % emailState.messages.length];
        }

        // We pass the campaign object to replaceVariables so campaign variables are handled
        const mergeData = { ...campaign, ...contact };
        const finalSubject = replaceVariables(subject, mergeData);
        const finalMessage = replaceVariables(message, mergeData);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
          `&to=${encodeURIComponent(contact.email)}` +
          `&su=${encodeURIComponent(finalSubject)}` +
          `&body=${encodeURIComponent(finalMessage)}`;

        window.open(gmailUrl, '_blank');
        opened++;
        
        contact.status = 'sent';
        contact.lastAction = new Date().toLocaleTimeString();
        
        updateEmailTable();
        updateEmailStats();
        
        // Save campaign emails array
        window.campaignManager.updateCampaign(campaignId, { emails: emailState.contacts });

        // Once finished
        if (i === pendingContacts.length - 1) {
          btnStart.disabled = false;
          btnStart.innerHTML = origText;
          toast(`Opened ${opened} Gmail compose window${opened !== 1 ? 's' : ''} ✓`);
        }
      }, i * delayMs);
    });

    updateEmailTable();
    updateEmailStats();
  });

  if (btnPause) btnPause.addEventListener('click', () => {
    pauseCampaign();
    if (btnPause) btnPause.style.display = 'none';
    if (btnResume) btnResume.style.display = '';
    toast('Campaign paused');
  });

  if (btnResume) btnResume.addEventListener('click', () => {
    resumeCampaign(
      (contact, subject, message) => {
        updateEmailTable();
        updateEmailStats();
        highlightSendingRow(contact.email);
      },
      () => {
        btnStart.style.display = '';
        if (extraBtns) extraBtns.style.display = 'none';
        toast('Campaign complete!');
      }
    );
    if (btnPause) btnPause.style.display = '';
    if (btnResume) btnResume.style.display = 'none';
    toast('Campaign resumed');
  });

  if (btnStop) btnStop.addEventListener('click', () => {
    stopCampaign();
    btnStart.style.display = '';
    if (extraBtns) extraBtns.style.display = 'none';
    updateEmailStats();
    toast('Campaign stopped');
  });

  // Initial preview
  updatePreview();
  updateEmailContactSummary();
}

function collectEmailInputs() {
  emailState.subjects = [];
  emailState.messages = [];

  $$('#subjectVariations .email-var-field').forEach(input => {
    const v = input.value.trim();
    if (v) emailState.subjects.push(v);
  });
  $$('#messageVariations .email-msg-field').forEach(input => {
    const v = input.value.trim();
    if (v) emailState.messages.push(v);
  });
}

function processEmailContacts(contacts) {
  emailState.contacts = cleanContacts(contacts);
  
  // Save to current campaign if available
  const campaignId = window.campaignManager.getActiveCampaignId();
  if (campaignId) {
    window.campaignManager.updateCampaign(campaignId, { emails: emailState.contacts });
  }
  
  updateEmailContactSummary();
  updateEmailTable();
  updateEmailStats();
  updatePreview();
}

function updateEmailContactSummary() {
  const summary = $('#emailContactSummary');
  const count = $('#emailContactCount');
  if (!summary || !count) return;
  const n = emailState.contacts.length;
  if (n > 0) {
    summary.style.display = 'flex';
    count.textContent = n + ' valid contact' + (n !== 1 ? 's' : '') + ' detected';
  } else {
    summary.style.display = 'none';
  }
}

function updateEmailStats() {
  const bar = $('#emailStatsBar');
  if (!bar) return;
  const total = emailState.contacts.length;
  const sent = emailState.contacts.filter(c => c.status === 'sent').length;
  const pending = emailState.contacts.filter(c => c.status === 'pending').length;
  const failed = emailState.contacts.filter(c => c.status === 'failed').length;

  bar.style.display = total > 0 ? 'flex' : 'none';

  const elTotal = $('#emailStatTotal');
  const elSent = $('#emailStatSent');
  const elPending = $('#emailStatPending');
  const elFailed = $('#emailStatFailed');
  const elFill = $('#emailProgressFill');
  const elPct = $('#emailProgressPct');

  if (elTotal) elTotal.textContent = total;
  if (elSent) elSent.textContent = sent;
  if (elPending) elPending.textContent = pending;
  if (elFailed) elFailed.textContent = failed;
  if (elFill) elFill.style.width = (total > 0 ? Math.round(sent / total * 100) : 0) + '%';
  if (elPct) elPct.textContent = (total > 0 ? Math.round(sent / total * 100) : 0) + '%';
}

function updateEmailTable() {
  const wrap = $('#emailTableWrap');
  const body = $('#emailTableBody');
  if (!wrap || !body) return;

  if (!emailState.contacts.length) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  body.innerHTML = '';
  emailState.contacts.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.dataset.email = c.email;
    if (c.status === 'sent') tr.classList.add('sending');
    const statusCls = c.status === 'sent' ? 'email-status-sent' : c.status === 'failed' ? 'email-status-failed' : 'email-status-pending';
    const statusTxt = c.status === 'sent' ? '✅ Sent' : c.status === 'failed' ? '❌ Failed' : '⏳ Pending';
    const isSent = c.status === 'sent';
    const btnStyle = isSent 
      ? 'color:#9ca3af; background:#6b728020; min-width:70px; justify-content:center;' 
      : 'color:#4ade80; background:#4ade8020; min-width:70px; justify-content:center;';
    const btnText = isSent ? 'Resend' : 'Send';
    
    tr.innerHTML = `
      <td class="td-email">${c.email}</td>
      <td class="td-domain">${c.domain || '-'}</td>
      <td>${c.name || '-'}</td>
      <td><span class="email-status ${statusCls}">${statusTxt}</span></td>
      <td style="font-size:.7rem;color:var(--text-tertiary)">${c.lastAction || '-'}</td>
      <td class="email-table-actions">
        <button class="btn-action-sm row-send-btn" data-idx="${i}" style="padding:4px 8px; font-size:0.75rem; font-weight:500; ${btnStyle}" ${!window.campaignManager.getActiveCampaignId() ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px;margin-right:4px;"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M22 4L12 13 2 4" stroke="currentColor" stroke-width="2"/></svg>
          ${btnText}
        </button>
        ${c.status === 'failed' ? `<button class="email-tbl-btn retry-btn" data-idx="${i}" title="Retry">
          <svg viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>` : ''}
        <button class="email-tbl-btn remove-btn" data-idx="${i}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </td>`;
    body.appendChild(tr);
  });

  // Wire up buttons
  body.querySelectorAll('.row-send-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Prevent multiple clicks
      if (btn.disabled) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      setTimeout(() => {
        btn.disabled = false;
        btn.style.opacity = '1';
      }, 1000);

      const idx = parseInt(btn.dataset.idx);
      const contact = emailState.contacts[idx];
      const campaignId = window.campaignManager.getActiveCampaignId();
      if (!campaignId) return;
      const campaign = window.campaignManager.getCampaignById(campaignId);
      
      collectEmailInputs();
      if (!emailState.subjects.length || !emailState.messages.length) {
        toast('Subjects and Messages are required.');
        return;
      }
      
      const useAntiSpam = $('#antiSpamToggle')?.checked ?? emailState.antiSpam;
      let subject, message;

      if (useAntiSpam) {
        subject = emailState.subjects[Math.floor(Math.random() * emailState.subjects.length)];
        message = emailState.messages[Math.floor(Math.random() * emailState.messages.length)];
      } else {
        subject = emailState.subjects[idx % emailState.subjects.length];
        message = emailState.messages[idx % emailState.messages.length];
      }

      const mergeData = { ...campaign, ...contact };
      const finalSubject = replaceVariables(subject, mergeData);
      const finalMessage = replaceVariables(message, mergeData);

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
        `&to=${encodeURIComponent(contact.email)}` +
        `&su=${encodeURIComponent(finalSubject)}` +
        `&body=${encodeURIComponent(finalMessage)}`;

      window.open(gmailUrl, '_blank');
      
      contact.status = 'sent';
      contact.lastAction = new Date().toLocaleTimeString();
      
      updateEmailTable();
      updateEmailStats();
      window.campaignManager.updateCampaign(campaignId, { emails: emailState.contacts });
    });
  });

  body.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      emailState.contacts[idx].status = 'pending';
      const campaignId = window.campaignManager.getActiveCampaignId();
      if (campaignId) window.campaignManager.updateCampaign(campaignId, { emails: emailState.contacts });
      updateEmailTable();
      updateEmailStats();
    });
  });
  body.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      emailState.contacts.splice(idx, 1);
      const campaignId = window.campaignManager.getActiveCampaignId();
      if (campaignId) window.campaignManager.updateCampaign(campaignId, { emails: emailState.contacts });
      updateEmailTable();
      updateEmailStats();
      updateEmailContactSummary();
    });
  });
}

function highlightSendingRow(email) {
  $$('#emailTableBody tr').forEach(tr => tr.classList.remove('sending'));
  const row = $(`#emailTableBody tr[data-email="${email}"]`);
  if (row) row.classList.add('sending');
}

function updatePreview() {
  collectEmailInputs();
  const preview = generatePreview();
  const subjEl = $('#previewSubject');
  const bodyEl = $('#previewBody');
  if (subjEl) subjEl.textContent = preview.subject || 'Add subjects above to preview';
  if (bodyEl) bodyEl.textContent = preview.message || 'Add a message above to see the preview here...';
  
  // Auto-save to campaign
  const activeId = window.campaignManager?.getActiveCampaignId();
  if (activeId) {
    window.campaignManager.updateCampaign(activeId, {
      subjects: emailState.subjects,
      messages: emailState.messages
    });
  }
}

// ============================================================
// UTILS
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== PATTERN PANEL INIT ====================
function initPatternPanel() {
  const input    = $('#patternInput');
  const validMsg = $('#patValidMsg');
  const validIcon= $('#patValidIcon');
  const previewChips = $('#patPreviewChips');
  const previewStrip = $('#patPreviewStrip');

  // --- Real-time validation + live preview ---
  function updatePatternUI(raw) {
    if (!raw) {
      if (validMsg) { validMsg.style.display = 'none'; }
      if (validIcon) { validIcon.textContent = ''; validIcon.className = 'pat-valid-icon'; }
      if (previewStrip) previewStrip.style.display = 'none';
      return;
    }
    const result = validatePattern(raw);
    if (!result.valid) {
      if (validMsg) { validMsg.textContent = result.error; validMsg.style.display = ''; validMsg.style.color = 'var(--danger)'; }
      if (validIcon) { validIcon.textContent = '✕'; validIcon.className = 'pat-valid-icon pat-icon-error'; }
      if (previewStrip) previewStrip.style.display = 'none';
    } else {
      if (validMsg) { validMsg.style.display = 'none'; }
      if (validIcon) { validIcon.textContent = '✓'; validIcon.className = 'pat-valid-icon pat-icon-ok'; }
      // Generate live preview chips
      if (previewChips && previewStrip) {
        try {
          const examples = previewPattern(raw, 6);
          previewChips.innerHTML = examples
            .map(e => `<span class="pat-preview-chip">${e}</span>`)
            .join('');
          previewStrip.style.display = 'flex';
        } catch(e) { previewStrip.style.display = 'none'; }
      }
    }
  }

  if (input) {
    input.addEventListener('input', debounce(() => updatePatternUI(input.value.trim()), 180));
    // Initial state
    updatePatternUI(input.value.trim());
  }

  // --- Letter Pool toggle (All / Custom) ---
  const btnPoolAll    = $('#btnPoolAll');
  const btnPoolCustom = $('#btnPoolCustom');
  const letterGrids   = $('#patternLetterGrids');

  [btnPoolAll, btnPoolCustom].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      [btnPoolAll, btnPoolCustom].forEach(b => b?.classList.remove('active'));
      btn.classList.add('active');
      const isCustom = btn.dataset.pool === 'custom';
      if (letterGrids) letterGrids.style.display = isCustom ? '' : 'none';
      if (!isCustom) {
        // Reset to all letters
        genState.selectedConsonants = 'bcdfghjklmnpqrstvwxyz'.split('');
        genState.selectedVowels = 'aeiou'.split('');
        document.querySelectorAll('#consonantGrid .letter-btn, #vowelGrid .letter-btn')
          .forEach(b => b.classList.add('selected'));
      }
    });
  });

  // --- "How To Use" button → scroll & open details ---
  const btnHelp = $('#btnPatHelp');
  const howToDetails = $('#patHowTo');
  if (btnHelp && howToDetails) {
    btnHelp.addEventListener('click', () => {
      howToDetails.open = true;
      howToDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- "Use This" example buttons ---
  document.querySelectorAll('.pat-ex-use-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.pat-example-card');
      const pat = card?.dataset.pattern;
      if (pat && input) {
        input.value = pat;
        updatePatternUI(pat);
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Close the details
        if (howToDetails) howToDetails.open = false;
      }
    });
  });

  // --- Tooltip popup (How To Use button as secondary trigger) ---
  const tooltipOverlay = $('#patTooltipOverlay');
  const btnCloseTooltip = $('#btnPatTooltipClose');
  if (tooltipOverlay && btnCloseTooltip) {
    btnCloseTooltip.addEventListener('click', () => { tooltipOverlay.style.display = 'none'; });
    tooltipOverlay.addEventListener('click', e => {
      if (e.target === tooltipOverlay) tooltipOverlay.style.display = 'none';
    });
  }
}

// ==================== INIT ====================
export async function initApp() {
  const loading = $('#loadingOverlay');
  if (loading) loading.classList.add('active');

  autoCleanupCache();

  // Theme initialization — centralized via theme.js
  initTheme('#themeToggle');

  // Sidebar initialization
  const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (sidebarCollapsed && window.innerWidth > 768) {
    $('#sidebar').classList.add('collapsed');
  }

  // Load saved mode from localStorage
  const savedMode = localStorage.getItem('domainMode');
  state.smartMode = savedMode !== 'fast'; // Default to smart

  // Sync UI mode buttons
  $$('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === (state.smartMode ? 'smart' : 'fast'));
  });

  let initialData = null;
  try {
    initialData = await loadData(state.smartMode);
  } catch (err) {
    console.error("Init Data Load Error:", err);
    // If SMART mode fails, fallback to FAST mode on load
    state.smartMode = false;
    localStorage.setItem('domainMode', 'fast');
    $$('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === 'fast');
    });
    initialData = await loadData(false);
  }

  // Populate Keyword Niche Dropdown dynamically
  if (initialData && initialData.KEYWORD_CATEGORIES) {
    const kwNicheDropdown = $('#kwNicheDropdown');
    const kwNicheSelect = $('#kwNicheSelect');
    if (kwNicheDropdown) {
      kwNicheDropdown.innerHTML = '';
      Object.keys(initialData.KEYWORD_CATEGORIES).forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'select-option' + (index === 0 ? ' active' : '');
        div.dataset.value = cat;
        div.textContent = cat;
        kwNicheDropdown.appendChild(div);
      });
      // Set the first item as selected in the trigger text
      const firstCat = Object.keys(initialData.KEYWORD_CATEGORIES)[0];
      if (kwNicheSelect) {
        const triggerText = kwNicheSelect.querySelector('.selected-text');
        if (triggerText) triggerText.textContent = firstCat;
      }
    }
  }

  // Letter grids
  const cg = $('#consonantGrid');
  const vg = $('#vowelGrid');
  if (cg) buildLetterGrid(cg, 'bcdfghjklmnpqrstvwxyz'.split(''), genState.selectedConsonants, 'C');
  if (vg) buildLetterGrid(vg, 'aeiou'.split(''), genState.selectedVowels, 'V');

  // Pattern Panel advanced wiring
  initPatternPanel();

  // Custom selects
  initCustomSelects();

  // Favorites system
  initFavorites();

  // Text tools
  initTextTools();

  // Navigation
  $$('.nav-item').forEach(n => {
    if (n.dataset.tool) n.addEventListener('click', e => {
      e.preventDefault();
      switchTool(n.dataset.tool);
      $('#sidebar').classList.remove('open');
      $('#sidebarOverlay').classList.remove('active');
    });
  });

  // Mobile/Desktop menu toggle
  $('#menuToggle').addEventListener('click', () => {
    const sidebar = $('#sidebar');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      $('#sidebarOverlay').classList.toggle('active');
    } else {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    }
  });
  $('#sidebarOverlay').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('active');
    closeAllActionMenus();
  });

  // Close action menus on global click
  document.addEventListener('click', e => {
    if (!e.target.closest('.domain-action-menu') && !e.target.closest('.action-panel')) {
      closeAllActionMenus();
    }
  });

  // Handle favorite toggles from cards.js rendered results
  document.addEventListener('fav-toggle', e => {
    const { domain, btn } = e.detail;
    const added = toggleFavorite(domain);
    btn.classList.toggle('active', added);
  });

  // Theme toggle handled by initTheme() in theme.js

  // Home live search functionality
  const homeSearchInput = $('#homeSearchInput');
  const btnHomeSearch = $('#btnHomeSearch');
  const homeLiveResults = $('#homeLiveResults');
  
  if (homeSearchInput) {
    const performHomeSearch = async () => {
      const query = homeSearchInput.value.trim();
      if (!query) {
        if (homeLiveResults) homeLiveResults.style.display = 'none';
        return;
      }
      if (homeLiveResults) {
        homeLiveResults.style.display = 'block';
        homeLiveResults.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">Searching...</div>';
      }
      
      const keywords = query.split(' ').filter(k => k);
      let domains = [];
      if (query.includes('.')) {
        domains = [{ name: query, available: 'checking' }];
      } else {
        domains = generateKeyword({
          keywords: [keywords.join('')],
          category: 'all',
          usePrefix: false,
          useSuffix: true,
          useCategoryKws: false,
          useCombine: false,
          limit: 5, 
          smartMode: false
        });
      }
      
      state.domains = domains;
      
      if (homeLiveResults) {
        let html = '<div class="results-grid" style="grid-template-columns: 1fr;">';
        domains.forEach((d, i) => {
          html += `<div class="domain-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; animation-delay: ${i*0.03}s" onclick="window.location.href='domain.html?domain='+encodeURIComponent('${d.name}')">
                     <span style="font-size: 1.1rem; font-weight: 600;">${d.name}</span>
                     <span class="status-dot" style="background: var(--text-muted)"></span>
                   </div>`;
        });
        html += '</div>';
        homeLiveResults.innerHTML = html;
      }
      
      // Real check
      try {
        const resultsMap = await bulkCheckDomains(domains, { useCache: true });
        applyResultsToData(domains, resultsMap);
        if (homeLiveResults && homeSearchInput.value.trim() === query) {
          let html = '<div class="results-grid" style="grid-template-columns: 1fr;">';
          domains.forEach((d, i) => {
             const isAvail = d.available === true;
             const color = isAvail ? 'var(--success)' : 'var(--danger)';
             const status = isAvail ? 'Available' : 'Taken';
             html += `<div class="domain-card" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-left: 4px solid ${color};" onclick="window.location.href='domain.html?domain='+encodeURIComponent('${d.name}')">
                       <span style="font-size: 1.1rem; font-weight: 600;">${d.name}</span>
                       <span style="font-size: 0.8rem; font-weight: 700; color: ${color}">${status}</span>
                     </div>`;
          });
          html += '</div>';
          homeLiveResults.innerHTML = html;
        }
      } catch (e) {}
    };

    homeSearchInput.addEventListener('input', debounce(performHomeSearch, 400));
    homeSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performHomeSearch();
    });
    if (btnHomeSearch) btnHomeSearch.addEventListener('click', performHomeSearch);
  }

  // Favorites header button
  const favHeaderBtn = $('#btnFavHeader');
  if (favHeaderBtn) {
    favHeaderBtn.addEventListener('click', () => openFavoritesPanel());
  }

  // Listen for favorites changes to update header
  setFavoritesChangeListener(() => {
    const count = getFavoritesCount();
    if (favHeaderBtn) {
      favHeaderBtn.classList.toggle('active', count > 0);
    }
  });

  // Button click ripple effect for generate buttons
  $$('.btn-generate').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--ry', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
  });

  // Mode toggle
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('active')) return; // Already active

      $$('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const newMode = btn.dataset.mode === 'smart';
      
      state.smartMode = newMode;
      localStorage.setItem('domainMode', newMode ? 'smart' : 'fast');

      // 🔁 MODE SWITCHING RULES: clear previous results
      const resDiv = $('#resultsContainer');
      if (resDiv) resDiv.innerHTML = '';
      state.lastResults = [];

      // 🔁 MODE SWITCHING RULES: reload data source completely
      try {
        await loadData(state.smartMode);
      } catch (err) {
        if (resDiv) {
          resDiv.innerHTML = `<div class="dc-error-msg">⚠️ ${err.message}</div>`;
        }
      }
    });
  });

  // Limit selector
  $$('.limit-select').forEach(sel => {
    sel.addEventListener('change', () => {
      state.limit = parseInt(getSelectValue('resultLimit') || '50');
    });
  });

  // Niche pills
  $$('.niche-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const g = $('#geoKeyword');
      if (g) g.value = pill.dataset.niche;
    });
  });

  // Generate buttons
  const genBtns = {
    btnGeoGenerate: 'geo', btnKwGenerate: 'keyword', btnPatternGenerate: 'pattern',
    btnBrandGenerate: 'brandable', btnNumGenerate: 'numeric',
    btnSuggestGenerate: 'suggestor', btnWordlistGenerate: 'wordlist'
  };
  Object.entries(genBtns).forEach(([id, type]) => {
    const btn = $('#' + id);
    if (btn) btn.addEventListener('click', () => handleGenerate(type));
  });

  // Gen Domain News button
  const btnGenDomains = $('#btnGenDomains');
  if (btnGenDomains) btnGenDomains.addEventListener('click', handleGenDomains);

  // API Settings inline buttons in Gen Domain News
  const btnHowToGetKeysInline = $('#btnHowToGetKeysInline');
  const btnOpenApiSettingsInline = $('#btnOpenApiSettingsInline');
  if (btnHowToGetKeysInline) btnHowToGetKeysInline.addEventListener('click', () => $('#getKeysOverlay')?.classList.add('open'));
  if (btnOpenApiSettingsInline) btnOpenApiSettingsInline.addEventListener('click', () => $('#settingsOverlay')?.classList.add('open'));

  // Generation Mode selector
  $$('.gen-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gen-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      genNewsState.mode = btn.dataset.mode;
      const hintEl = $('#genModeHint');
      if (hintEl) hintEl.innerHTML = GEN_MODE_HINTS[genNewsState.mode] || '';
    });
  });

  // AI Provider selector
  $$('.ai-provider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ai-provider-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      genNewsState.aiProvider = btn.dataset.provider;
      saveAiProvider(genNewsState.aiProvider);
      const hintEl = $('#aiProviderHint');
      if (hintEl) hintEl.textContent = AI_PROVIDER_HINTS[genNewsState.aiProvider] || '';
    });
  });

  // Settings panel open/close
  const settingsOverlay = $('#settingsOverlay');
  const btnSettings = $('#settingsBtn');
  const btnSettingsClose = $('#settingsClose');
  if (btnSettings) btnSettings.addEventListener('click', () => settingsOverlay?.classList.add('open'));
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', () => settingsOverlay?.classList.remove('open'));
  if (settingsOverlay) settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('open');
  });

  // Save all settings
  const btnSaveSettings = $('#btnSaveSettings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
    const keys = {
      gemini:     $('#settingsGeminiKey')?.value.trim() || '',
      grok:       $('#settingsGrokKey')?.value.trim() || '',
      mediastack: $('#settingsMediastackKey')?.value.trim() || '',
      gnews:      $('#settingsGnewsKey')?.value.trim() || '',
      newsapi:    $('#settingsNewsapiKey')?.value.trim() || '',
      currents:   $('#settingsCurrentsKey')?.value.trim() || ''
    };
    saveAllApiKeys(keys);
    toast('All API keys saved');
    settingsOverlay?.classList.remove('open');
  });

  // Get API Keys dialog
  const getKeysOverlay = $('#getKeysOverlay');
  const btnGetApiKeys = $('#btnGetApiKeys');
  const btnGetKeysClose = $('#getKeysClose');
  if (btnGetApiKeys) btnGetApiKeys.addEventListener('click', () => getKeysOverlay?.classList.add('open'));
  if (btnGetKeysClose) btnGetKeysClose.addEventListener('click', () => getKeysOverlay?.classList.remove('open'));
  if (getKeysOverlay) getKeysOverlay.addEventListener('click', e => {
    if (e.target === getKeysOverlay) getKeysOverlay.classList.remove('open');
  });
  // Close dialog on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      settingsOverlay?.classList.remove('open');
      getKeysOverlay?.classList.remove('open');
    }
  });

  // Tool buttons
  const bb = $('#btnBulkCheck'); if (bb) bb.addEventListener('click', handleBulkCheck);
  const be = $('#btnExtract'); if (be) be.addEventListener('click', handleExtract);
  const ee = $('#btnExtractEmail'); if (ee) ee.addEventListener('click', handleExtractEmails);

  // ==================== SMART EMAIL TOOL ====================
  initEmailTool();
   
  // ==================== CAMPAIGN MANAGER ====================
  initCampaignManager();

  // Analyzer button
  const ba = $('#btnAnalyze'); if (ba) ba.addEventListener('click', handleAnalyze);

  // Analyzer tabs
  initAnalyzerTabs();

  // CSV Upload
  initCSVUpload();

  // Paste Example button
  const btnExample = $('#btnPasteExample');
  if (btnExample) btnExample.addEventListener('click', () => {
    const ta = $('#analyzerInput');
    if (ta) { ta.value = EXAMPLE_PASTE; ta.focus(); toast('Example domains pasted'); }
  });

  // Clear Input button
  const btnClear = $('#btnClearInput');
  if (btnClear) btnClear.addEventListener('click', () => {
    const ta = $('#analyzerInput');
    if (ta) { ta.value = ''; ta.focus(); }
    // Also clear CSV data
    analyzerData.csvData = '';
    analyzerData.rawInput = '';
    analyzerData.domains = [];
    const dropZone = $('#csvDropZone');
    const fileInfo = $('#csvFileInfo');
    if (dropZone) dropZone.style.display = '';
    if (fileInfo) fileInfo.style.display = 'none';
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';
  });

  // CSV Remove button
  const btnRemove = $('#csvRemoveBtn');
  if (btnRemove) btnRemove.addEventListener('click', () => {
    analyzerData.csvData = '';
    analyzerData.rawInput = '';
    const dropZone = $('#csvDropZone');
    const fileInfo = $('#csvFileInfo');
    const fileInput = $('#csvFileInput');
    if (dropZone) dropZone.style.display = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (fileInput) fileInput.value = '';
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';
  });

  // Handle "Send to Smart Analyzer" from any domain card
  document.addEventListener('send-to-analyzer', e => {
    const { domain } = e.detail;
    if (!domain) return;

    // Switch to analyzer panel
    switchTool('analyzer');

    // Switch to paste tab
    $$('.analyzer-tab[data-tab]').forEach(t => t.classList.remove('active'));
    $$('.analyzer-tab-content').forEach(c => {
      if (c.closest('#analyzer-panel')) c.classList.remove('active');
    });
    const pasteTab = $('.analyzer-tab[data-tab="paste"]');
    const pasteContent = $('#tab-paste');
    if (pasteTab) pasteTab.classList.add('active');
    if (pasteContent) pasteContent.classList.add('active');

    // Clear CSV data so textarea is used
    analyzerData.csvData = '';

    // Fill textarea with domain
    const ta = $('#analyzerInput');
    if (ta) {
      ta.value = domain;
      ta.focus();
      ta.select();
      // Trigger highlight animation
      ta.classList.remove('imported');
      void ta.offsetWidth; // force reflow
      ta.classList.add('imported');
      setTimeout(() => ta.classList.remove('imported'), 1300);
    }

    // Reset previous results
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';

    // Show import toast
    toast('Domain imported: ' + domain);

    // Auto-run analysis after a short delay
    setTimeout(() => handleAnalyze(), 400);
  });

  // Analyzer filters
  $('#filterAvailable')?.addEventListener('change', applyAnalyzerFilters);
  $('#filterMinCpc')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));
  $('#filterMinAge')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));
  $('#filterMinScore')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));

  // Analyzer sort & class filter
  const aSort = $('#analyzerSort');
  if (aSort) aSort.addEventListener('change', applyAnalyzerFilters);
  const aClass = $('#analyzerClassFilter');
  if (aClass) aClass.addEventListener('change', applyAnalyzerFilters);

  const sortSel = $('#resultsSort');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      uiState.sort = getSelectValue('resultsSort') || 'default';
      saveGlobalFilters();
      applyFilterSort(state.domains, copyText);
    });
  }

  // ==================== VISIBILITY FILTER ====================
  const visFilterEl = $('#domainVisibilityFilter');
  if (visFilterEl) {
    visFilterEl.querySelectorAll('.select-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.dataset.value; // 'all' | 'available'
        uiState.visibilityFilter = val;
        saveGlobalFilters();

        // Update active class
        visFilterEl.querySelectorAll('.select-option').forEach(o => o.classList.toggle('active', o === opt));

        // Update trigger text
        const triggerText = visFilterEl.querySelector('.selected-text');
        if (triggerText) triggerText.textContent = val === 'available' ? 'Available Only' : 'All Domains';

        // Add active style to trigger button when filtering
        const triggerBtn = visFilterEl.querySelector('.custom-select-trigger');
        if (triggerBtn) triggerBtn.classList.toggle('filter-active', val === 'available');

        // Instant filter — no regeneration
        applyFilterSort(state.domains, copyText);

        // Close the dropdown
        visFilterEl.classList.remove('open');
      });
    });
  }

  // Brand range
  const range = $('#brandLength'), rangeVal = $('#brandLengthValue');
  if (range) range.addEventListener('input', () => { if (rangeVal) rangeVal.textContent = range.value + ' letters'; });

  // Length selector
  $$('.len-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.len-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (loading) loading.classList.remove('active');
  
  // Parse legacy search params and path
  const urlParams = new URLSearchParams(window.location.search);
  const legacyTool = urlParams.get('tool');
  const currentPath = window.location.pathname.replace(/\/$/, '');
  let savedTool = REVERSE_ROUTE[currentPath] || localStorage.getItem('activeTool') || 'geo';

  if (legacyTool && ROUTE_MAP[legacyTool]) {
    savedTool = legacyTool;
    const cleanUrl = ROUTE_MAP[legacyTool];
    window.history.replaceState({ tool: legacyTool }, '', cleanUrl);
  } else if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const cleanUrl = ROUTE_MAP[savedTool] || '/geo-domains';
    window.history.replaceState({ tool: savedTool }, '', cleanUrl);
  } else {
    // Ensure history state is populated for the current clean path
    const cleanUrl = ROUTE_MAP[savedTool] || '/geo-domains';
    window.history.replaceState({ tool: savedTool }, '', cleanUrl);
  }
  
  restoreGlobalFilters();
  switchTool(savedTool, false);

  // Restore scroll position from previous session
  const savedScroll = sessionStorage.getItem('globalScrollPos');
  if (savedScroll) {
    setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' }), 50);
  }
  
  // Track scroll position
  window.addEventListener('scroll', debounce(() => {
    sessionStorage.setItem('globalScrollPos', window.scrollY);
  }, 100));

  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tool) {
      switchTool(e.state.tool, false);
    } else {
      const path = window.location.pathname.replace(/\/$/, '');
      const tool = REVERSE_ROUTE[path] || localStorage.getItem('activeTool') || 'geo';
      switchTool(tool, false);
    }
  });

  // Legacy state restore logic removed - now handled natively by switchTool() via restoreToolDomains() and restoreToolInputs()

  // Auto-load all saved API keys into all inputs
  const savedKeys = loadAllApiKeys();
  // Gen Domain News panel inputs
  if (savedKeys.gemini     && $('#genNewsGeminiKey'))     $('#genNewsGeminiKey').value     = savedKeys.gemini;
  if (savedKeys.mediastack && $('#genNewsMediastackKey')) $('#genNewsMediastackKey').value = savedKeys.mediastack;
  if (savedKeys.gnews      && $('#genNewsGnewsKey'))      $('#genNewsGnewsKey').value      = savedKeys.gnews;
  if (savedKeys.newsapi    && $('#genNewsNewsapiKey'))    $('#genNewsNewsapiKey').value    = savedKeys.newsapi;
  if (savedKeys.currents   && $('#genNewsCurrentsKey'))   $('#genNewsCurrentsKey').value   = savedKeys.currents;
  // Settings panel inputs
  if (savedKeys.gemini     && $('#settingsGeminiKey'))     $('#settingsGeminiKey').value     = savedKeys.gemini;
  if (savedKeys.grok       && $('#settingsGrokKey'))       $('#settingsGrokKey').value       = savedKeys.grok;
  if (savedKeys.mediastack && $('#settingsMediastackKey')) $('#settingsMediastackKey').value = savedKeys.mediastack;
  if (savedKeys.gnews      && $('#settingsGnewsKey'))      $('#settingsGnewsKey').value      = savedKeys.gnews;
  if (savedKeys.newsapi    && $('#settingsNewsapiKey'))    $('#settingsNewsapiKey').value    = savedKeys.newsapi;
  if (savedKeys.currents   && $('#settingsCurrentsKey'))   $('#settingsCurrentsKey').value   = savedKeys.currents;

  // Restore saved AI provider preference
  const savedProvider = loadAiProvider();
  genNewsState.aiProvider = savedProvider;
  const savedProvBtn = $('[data-provider="' + savedProvider + '"]');
  if (savedProvBtn) {
    $$('.ai-provider-btn').forEach(b => b.classList.remove('active'));
    savedProvBtn.classList.add('active');
  }

  // Tools Overview - "Use Tool" buttons
  $$('.tool-overview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool) switchTool(tool);
    });
  });

  // Tools Overview - CTA button
  const btnStartUsingTools = $('#btnStartUsingTools');
  if (btnStartUsingTools) {
    btnStartUsingTools.addEventListener('click', () => {
      switchTool('geo');
    });
  }

  // Home page - Start Generating button
  const btnHomeStartGenerating = $('#btnHomeStartGenerating');
  if (btnHomeStartGenerating) {
    btnHomeStartGenerating.addEventListener('click', () => {
      switchTool('geo');
    });
  }

  // Home page - View All Tools button
  const btnHomeViewTools = $('#btnHomeViewTools');
  if (btnHomeViewTools) {
    btnHomeViewTools.addEventListener('click', () => {
      // Navigate to generators section as overview was removed
      switchTool('geo');
    });
  }

  // ==================== EXPORT SYSTEM (Advanced) ====================
  // Rebuild the export UI and attach all events.
  // syncExportDomains() is called each time state.domains is updated.
  initExportSystem();

  // Expose a global update shim so legacy code paths still work.
  window.updateExportButton = () => syncExportDomains(state.domains, state.activeTool);

  // Intercept click on related tools inside SEO section for SPA switches
  const seoContainer = $('#seoContentSection');
  if (seoContainer) {
    seoContainer.addEventListener('click', e => {
      const link = e.target.closest('.seo-related-link');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const toolKey = REVERSE_ROUTE[href];
        if (toolKey) {
          switchTool(toolKey);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  }

}


