// campaignManager.js - Campaign Management System with localStorage Persistence
import { $, $$ } from './utils.js';

// ============================================================
// STATE & CONSTANTS
// ============================================================
const STORAGE_KEY = 'email_campaigns';
let campaigns = [];
let currentCampaignId = null; // Used for the modal edit form
export let activeCampaignId = null; // Used for the selected campaign in the workflow

// ============================================================
// EMAIL TEMPLATES
// ============================================================

// Built-in fallback templates (used if JSON file can't be fetched)
const FALLBACK_TEMPLATES = [
  {
    id: 'professional-offer',
    name: 'Professional Offer',
    subject: 'Business Opportunity',
    body: `Hi {{name}},\n\nI currently own {{domain}} and I believe it could be a valuable asset for your business.\n\nI'm open to selling it at {{price}}. This domain has strong brandability and could help establish your online presence quickly.\n\nWould you be interested in discussing this further?\n\nBest regards`
  },
  {
    id: 'brand-value',
    name: 'Brand Value Pitch',
    subject: 'A Valuable Branding Opportunity',
    body: `Hello {{name}},\n\nThe domain {{domain}} is currently available for acquisition and could significantly strengthen your brand identity.\n\nAt {{price}}, this is a strategic investment that pays for itself in brand recognition alone.\n\nI'd love to hear your thoughts — happy to jump on a quick call.\n\nBest regards`
  },
  {
    id: 'opportunity',
    name: 'Opportunity & Scarcity',
    subject: 'Exclusive Opportunity for Your Business',
    body: `Hi {{name}},\n\nI wanted to reach out before I list {{domain}} publicly — I thought your business might benefit most from owning it.\n\nAsking price: {{price}}\n\nThis type of domain doesn't come up often and I expect strong interest once it's listed. Let me know if you'd like to move quickly.\n\nBest regards`
  },
  {
    id: 'friendly',
    name: 'Friendly Outreach',
    subject: 'Quick Question',
    body: `Hey {{name}},\n\nI own {{domain}} and I've been wondering if it might be a better fit for a business like yours than sitting unused.\n\nWould you be open to a quick chat? I'm flexible on price — {{price}} is my starting point but I'm happy to discuss.\n\nCheers`
  },
  {
    id: 'blank',
    name: 'Blank Template',
    subject: '',
    body: ''
  }
];

let emailTemplates = [...FALLBACK_TEMPLATES];

// Load templates from JSON file; fall back silently to built-ins
async function loadEmailTemplates() {
  try {
    const res = await fetch('assets/data/email-templates.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        emailTemplates = data;
      }
    }
  } catch (_) {
    // Silently use fallback templates
  }
  // Populate the template selector once templates are loaded
  _populateTemplateSelector();
}

function getTemplateById(id) {
  return emailTemplates.find(t => t.id === id) || null;
}

// Populate the <select> with all loaded templates
function _populateTemplateSelector() {
  const sel = $('#campaignTemplate');
  if (!sel) return;
  sel.innerHTML = emailTemplates.map(t =>
    `<option value="${t.id}">${escapeHtml(t.name)}</option>`
  ).join('');
}

// Apply a template to the subject + body fields in the modal
// If prefillDomain is provided, it's stored in the domain field (body keeps {{domain}} literal)
export function applyTemplate(templateId, prefillDomain) {
  const tpl = getTemplateById(templateId);
  if (!tpl) return;

  const subjectEl = $('#campaignSubject');
  const bodyEl    = $('#campaignBody');
  const nameEl    = $('#campaignName');

  if (subjectEl) subjectEl.value = tpl.subject;
  if (bodyEl)    bodyEl.value    = tpl.body;

  // Auto-suggest campaign name if empty
  if (nameEl && !nameEl.value.trim()) {
    const domain = prefillDomain || ($('#campaignDomain')?.value?.trim()) || '';
    nameEl.value = domain ? `${domain} Outreach` : '';
  }
}

// Legacy EMAIL_TEMPLATE kept for backward compat with openCampaignDetails preview
const EMAIL_TEMPLATE = {
  subjects: [
    'Business Opportunity',
    'Quick question about {{domain}}'
  ],
  messages: [
    `Hi {{name}},\n\nI currently own {{domain}} and I believe it could be a valuable asset for your business.\n\nI'm open to selling it at {{price}}. This domain has strong brandability and could help establish your online presence quickly.\n\nWould you be interested in discussing this further?\n\nBest regards`
  ]
};

// ============================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================

export function loadCampaigns() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    campaigns = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading campaigns:', e);
    campaigns = [];
  }
  return campaigns;
}

export function saveCampaigns() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    return true;
  } catch (e) {
    console.error('Error saving campaigns:', e);
    return false;
  }
}

export function getCampaignById(id) {
  return campaigns.find(c => c.id === id);
}

export function deleteCampaignById(id) {
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx >= 0) {
    campaigns.splice(idx, 1);
    saveCampaigns();
    if (activeCampaignId === id) {
      activeCampaignId = null;
      updateEmailToolVisibility();
      updateCampaignSelector();
    }
    return true;
  }
  return false;
}

// ============================================================
// CAMPAIGN CRUD
// ============================================================

export function createCampaign(data) {
  const campaign = {
    id: Date.now().toString(),
    name: data.name || '',
    domain: data.domain || '',
    emails: data.emails || [],
    price: data.price || '',
    backlinks: data.backlinks || '',
    cpc: data.cpc || '',
    status: data.status || 'draft',
    notes: data.notes || '',
    // Use passed subject/messages from template, or fall back to built-ins
    subjects: data.subjects || [...EMAIL_TEMPLATE.subjects],
    messages: data.messages || [...EMAIL_TEMPLATE.messages],
    templateId: data.templateId || 'professional-offer',
    createdAt: new Date().toISOString()
  };

  campaigns.unshift(campaign);
  saveCampaigns();

  // Automatically select the newly created campaign
  activeCampaignId = campaign.id;
  updateCampaignSelector();
  updateEmailToolVisibility();
  document.dispatchEvent(new CustomEvent('campaign-selected', { detail: { id: activeCampaignId } }));

  return campaign;
}

export function updateCampaign(id, data) {
  const campaign = getCampaignById(id);
  if (!campaign) return null;

  Object.assign(campaign, {
    name:      data.name      !== undefined ? data.name      : campaign.name,
    domain:    data.domain    !== undefined ? data.domain    : campaign.domain,
    emails:    data.emails    !== undefined ? data.emails    : campaign.emails,
    price:     data.price     !== undefined ? data.price     : campaign.price,
    backlinks: data.backlinks !== undefined ? data.backlinks : campaign.backlinks,
    cpc:       data.cpc       !== undefined ? data.cpc       : campaign.cpc,
    status:    data.status    !== undefined ? data.status    : campaign.status,
    notes:     data.notes     !== undefined ? data.notes     : campaign.notes,
    subjects:  data.subjects  !== undefined ? data.subjects  : campaign.subjects,
    messages:  data.messages  !== undefined ? data.messages  : campaign.messages,
    templateId: data.templateId !== undefined ? data.templateId : campaign.templateId
  });

  saveCampaigns();
  return campaign;
}

// ============================================================
// UI FUNCTIONS
// ============================================================

export function openModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.offsetHeight; // Trigger reflow for animation
    modal.classList.add('open');
  }
}

export function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
}

export function showSaveNotification() {
  const notif = $('#saveNotification');
  if (notif) {
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 2000);
  }
}

// Open the create-campaign modal with optional domain prefill
function openCreateModal(prefillDomain) {
  currentCampaignId = null;
  $('#campaignForm').reset();
  $('#campaignId').value = '';
  $('#campaignModalTitle').textContent = 'Create Campaign';

  // Show template selector (hidden in edit mode)
  const tplWrap = $('#templateSelectorWrap');
  if (tplWrap) tplWrap.style.display = 'block';

  const stepBar = $('#campaignStepBar');
  if (stepBar) stepBar.style.display = 'flex';

  // Show subject/body fields
  const emailFieldsWrap = $('#campaignEmailFieldsWrap');
  if (emailFieldsWrap) emailFieldsWrap.style.display = 'block';

  // Pre-fill domain if provided
  if (prefillDomain) {
    const domainEl = $('#campaignDomain');
    if (domainEl) domainEl.value = prefillDomain;
  }

  // Apply default template
  const tplSel = $('#campaignTemplate');
  const defaultTpl = tplSel?.value || 'professional-offer';
  applyTemplate(defaultTpl, prefillDomain);

  openModal('#campaignModalOverlay');
}

export function renderCampaignQuickList() {
  const preview   = $('#campaignListPreview');
  const quickList = $('#campaignQuickList');
  const countBadge = $('#campaignCountBadge');

  if (!preview || !quickList || !countBadge) return;

  if (campaigns.length === 0) {
    preview.style.display = 'none';
    return;
  }

  preview.style.display = 'block';
  countBadge.textContent = campaigns.length;

  const recent = campaigns.slice(0, 3);
  quickList.innerHTML = recent.map(c => `
    <div class="campaign-item-card" data-campaign-id="${c.id}">
      <div class="campaign-item-info">
        <div class="campaign-item-name">${escapeHtml(c.name)}</div>
        <div class="campaign-item-domain">${escapeHtml(c.domain)}</div>
      </div>
      <span class="campaign-status-badge campaign-status-${c.status}">${c.status}</span>
    </div>
  `).join('');

  $$('#campaignQuickList .campaign-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-campaign-id');
      openCampaignDetails(id);
    });
  });
}

export function renderCampaignsList() {
  const content = $('#campaignsListContent');
  const noMsg   = $('#noCampaignsMsg');

  if (!content) return;

  if (campaigns.length === 0) {
    content.style.display = 'none';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }

  if (noMsg) noMsg.style.display = 'none';
  content.style.display = 'flex';

  content.innerHTML = campaigns.map(c => `
    <div class="campaign-item-card" data-campaign-id="${c.id}">
      <div class="campaign-item-info">
        <div class="campaign-item-name">${escapeHtml(c.name)}</div>
        <div class="campaign-item-domain">${escapeHtml(c.domain)} • ${(c.emails ? c.emails.length : 0)} emails</div>
      </div>
      <div class="campaign-item-meta">
        ${c.price ? `<span style="font-size:.75rem;font-weight:600;color:var(--accent)">${escapeHtml(c.price)}</span>` : ''}
        <span class="campaign-status-badge campaign-status-${c.status}">${c.status}</span>
      </div>
    </div>
  `).join('');

  $$('#campaignsListContent .campaign-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-campaign-id');
      openCampaignDetails(id);
    });
  });
}

export function openCampaignDetails(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return;

  currentCampaignId = id;

  $('#detailCampaignName').textContent  = campaign.name;
  $('#detailDomain').textContent        = campaign.domain;
  $('#detailEmailCount').textContent    = (campaign.emails ? campaign.emails.length : 0);
  $('#detailPrice').textContent         = campaign.price || '-';

  const statusEl = $('#detailStatus');
  statusEl.textContent = campaign.status;
  statusEl.className   = `campaign-status-badge campaign-status-${campaign.status}`;

  $('#detailBacklinks').textContent = campaign.backlinks || '-';
  $('#detailCpc').textContent       = campaign.cpc || '-';

  const notesWrap = $('#detailNotesWrap');
  const notesEl   = $('#detailNotes');
  if (campaign.notes) {
    notesWrap.style.display = 'block';
    notesEl.textContent = campaign.notes;
  } else {
    notesWrap.style.display = 'none';
  }

  // Email preview — use saved subject/message; fall back to defaults
  const subjectTpl = (campaign.subjects && campaign.subjects[0]) || EMAIL_TEMPLATE.subjects[0] || '';
  const messageTpl = (campaign.messages && campaign.messages[0]) || EMAIL_TEMPLATE.messages[0] || '';
  const subject = subjectTpl
    .replace(/\{\{domain\}\}/gi, campaign.domain)
    .replace(/\{\{price\}\}/gi, campaign.price || 'N/A')
    .replace(/\{\{name\}\}/gi, 'there');
  const body = messageTpl
    .replace(/\{\{domain\}\}/gi, campaign.domain)
    .replace(/\{\{price\}\}/gi, campaign.price || 'N/A')
    .replace(/\{\{name\}\}/gi, 'there');

  $('#previewSubjectLine').textContent = subject;
  $('#previewEmailBody').textContent   = body;

  closeModal('#campaignsListModal');
  openModal('#campaignDetailsModal');
}

export function openEditCampaign(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return;

  currentCampaignId = id;

  $('#campaignId').value         = campaign.id;
  $('#campaignName').value       = campaign.name;
  $('#campaignDomain').value     = campaign.domain;
  $('#campaignPrice').value      = campaign.price;
  $('#campaignBacklinks').value  = campaign.backlinks;
  $('#campaignCpc').value        = campaign.cpc;
  $('#campaignStatus').value     = campaign.status;
  $('#campaignNotes').value      = campaign.notes;

  // Fill subject & body from saved campaign data
  const subjectEl = $('#campaignSubject');
  const bodyEl    = $('#campaignBody');
  if (subjectEl) subjectEl.value = (campaign.subjects && campaign.subjects[0]) || '';
  if (bodyEl)    bodyEl.value    = (campaign.messages && campaign.messages[0]) || '';

  // Hide template selector in edit mode (user already has an email)
  const tplWrap = $('#templateSelectorWrap');
  if (tplWrap) tplWrap.style.display = 'none';

  const stepBar = $('#campaignStepBar');
  if (stepBar) stepBar.style.display = 'none';

  // Show subject/body fields
  const emailFieldsWrap = $('#campaignEmailFieldsWrap');
  if (emailFieldsWrap) emailFieldsWrap.style.display = 'block';

  $('#campaignModalTitle').textContent = 'Edit Campaign';

  closeModal('#campaignDetailsModal');
  openModal('#campaignModalOverlay');
}

export function generateGmailLink(campaign) {
  const subjectTpl = (campaign.subjects && campaign.subjects[0]) || EMAIL_TEMPLATE.subjects[0] || '';
  const messageTpl = (campaign.messages && campaign.messages[0]) || EMAIL_TEMPLATE.messages[0] || '';

  const subject = subjectTpl
    .replace(/\{\{domain\}\}/gi, campaign.domain)
    .replace(/\{\{price\}\}/gi, campaign.price || 'N/A')
    .replace(/\{\{name\}\}/gi, 'there');
  const body = messageTpl
    .replace(/\{\{domain\}\}/gi, campaign.domain)
    .replace(/\{\{price\}\}/gi, campaign.price || 'N/A')
    .replace(/\{\{name\}\}/gi, 'there');

  const emailTo = (campaign.emails && campaign.emails[0]) || '';
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

// ============================================================
// INITIALIZATION
// ============================================================

export function initCampaignManager() {
  loadCampaigns();
  loadEmailTemplates(); // async — populates selector when done

  initCampaignSelector();
  updateEmailToolVisibility();

  // Create Campaign button
  const btnCreate = $('#btnCreateCampaign');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => openCreateModal());
  }

  // View Campaigns button
  const btnView = $('#btnViewCampaigns');
  if (btnView) {
    btnView.addEventListener('click', () => {
      renderCampaignsList();
      openModal('#campaignsListModal');
    });
  }

  // Close modal buttons
  $('#btnCloseCampaignModal')?.addEventListener('click', () => closeModal('#campaignModalOverlay'));
  $('#btnCancelCampaign')?.addEventListener('click',    () => closeModal('#campaignModalOverlay'));
  $('#btnCloseDetailsModal')?.addEventListener('click', () => closeModal('#campaignDetailsModal'));
  $('#btnCloseListModal')?.addEventListener('click',    () => closeModal('#campaignsListModal'));

  // Create first campaign button
  $('#btnCreateFirstCampaign')?.addEventListener('click', () => {
    closeModal('#campaignsListModal');
    openCreateModal();
  });

  // Template selector → live update subject + body
  $('#campaignTemplate')?.addEventListener('change', (e) => {
    const domain = $('#campaignDomain')?.value?.trim() || '';
    applyTemplate(e.target.value, domain);
  });

  // Domain field → update campaign name suggestion if empty
  $('#campaignDomain')?.addEventListener('input', (e) => {
    const nameEl = $('#campaignName');
    if (nameEl && !nameEl.value.trim()) {
      const domain = e.target.value.trim();
      if (domain) nameEl.value = `${domain} Outreach`;
    }
  });

  // Form submit
  $('#campaignForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const subject = ($('#campaignSubject')?.value?.trim()) || '';
    const body    = ($('#campaignBody')?.value?.trim())    || '';

    const data = {
      name:       $('#campaignName').value.trim(),
      domain:     $('#campaignDomain').value.trim(),
      price:      $('#campaignPrice').value.trim(),
      backlinks:  $('#campaignBacklinks').value.trim(),
      cpc:        $('#campaignCpc').value.trim(),
      status:     $('#campaignStatus').value,
      notes:      $('#campaignNotes').value.trim(),
      subjects:   subject ? [subject] : [...EMAIL_TEMPLATE.subjects],
      messages:   body    ? [body]    : [...EMAIL_TEMPLATE.messages],
      templateId: $('#campaignTemplate')?.value || 'professional-offer'
    };

    if (currentCampaignId) {
      updateCampaign(currentCampaignId, data);
    } else {
      createCampaign(data);
    }

    showSaveNotification();
    renderCampaignQuickList();
    updateCampaignSelector();

    setTimeout(() => { closeModal('#campaignModalOverlay'); }, 500);
  });

  // Edit campaign button
  $('#btnEditCampaign')?.addEventListener('click', () => {
    if (currentCampaignId) openEditCampaign(currentCampaignId);
  });

  // Delete campaign button
  $('#btnDeleteCampaign')?.addEventListener('click', () => {
    if (currentCampaignId && confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaignById(currentCampaignId);
      closeModal('#campaignDetailsModal');
      renderCampaignQuickList();
      renderCampaignsList();
    }
  });

  // Send via Gmail button
  $('#btnSendGmail')?.addEventListener('click', () => {
    const campaign = getCampaignById(currentCampaignId);
    if (campaign) {
      const url = generateGmailLink(campaign);
      window.open(url, '_blank');
    }
  });

  // Auto-fill from domain data (called from domain cards)
  window.fillCampaignFromDomain = function(domainData) {
    openCreateModal(domainData.domain || '');
    // Also pre-fill extra fields if provided
    if (domainData.cpc)       { const el = $('#campaignCpc');       if (el) el.value = domainData.cpc; }
    if (domainData.backlinks) { const el = $('#campaignBacklinks'); if (el) el.value = domainData.backlinks; }
  };

  renderCampaignQuickList();
}

// ============================================================
// WORKFLOW LOGIC
// ============================================================

export function updateEmailToolVisibility() {
  const sections = $$('#emailtool-panel .email-section');
  const controls = $('#emailtool-panel .email-campaign-controls');
  const stats    = $('#emailtool-panel .email-stats-bar');
  const table    = $('#emailtool-panel .email-table-wrap');

  const showSystem = !!activeCampaignId;

  sections.forEach((s, idx) => {
    if (idx > 0) s.style.display = showSystem ? 'block' : 'none';
  });

  if (controls) controls.style.display = showSystem ? 'flex'  : 'none';
  if (stats)    stats.style.display    = showSystem ? 'flex'  : 'none';
  if (table)    table.style.display    = showSystem ? 'block' : 'none';

  const previewList = $('#campaignListPreview');
  if (previewList) previewList.style.display = (campaigns.length > 0 && !showSystem) ? 'block' : 'none';
}

function updateCampaignSelector() {
  const selectorWrap = $('#campaignSelector');
  const selectorText = $('#campaignSelectorText');
  const dropdown     = $('#campaignSelectorDropdown');
  const btnView      = $('#btnViewCampaigns');

  if (campaigns.length === 0) {
    if (selectorWrap) selectorWrap.style.display = 'none';
    if (btnView)      btnView.style.display      = 'none';
    activeCampaignId = null;
    updateEmailToolVisibility();
    return;
  }

  if (selectorWrap) selectorWrap.style.display = 'block';
  if (btnView)      btnView.style.display      = 'flex';

  if (dropdown) {
    dropdown.innerHTML = campaigns.map(c =>
      `<div class="select-option ${activeCampaignId === c.id ? 'active' : ''}" data-value="${c.id}">${escapeHtml(c.name)}</div>`
    ).join('');

    dropdown.querySelectorAll('.select-option').forEach(opt => {
      opt.addEventListener('click', () => {
        dropdown.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        activeCampaignId = opt.getAttribute('data-value');
        if (selectorText) selectorText.textContent = opt.textContent;
        if (selectorWrap) selectorWrap.classList.remove('open');
        updateEmailToolVisibility();
        document.dispatchEvent(new CustomEvent('campaign-selected', { detail: { id: activeCampaignId } }));
      });
    });
  }

  if (selectorText) {
    const activeC = campaigns.find(c => c.id === activeCampaignId);
    selectorText.textContent = activeC ? activeC.name : 'Select Campaign';
  }
}

function initCampaignSelector() {
  updateCampaignSelector();
}

// Export for external use
window.campaignManager = {
  loadCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaignById,
  getCampaignById,
  openCampaignDetails,
  openEditCampaign,
  applyTemplate,
  fillCampaignFromDomain: window.fillCampaignFromDomain,
  getActiveCampaignId: () => activeCampaignId
};
