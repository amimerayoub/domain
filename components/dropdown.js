// components/dropdown.js — Viewport-aware custom select dropdown
// Uses fixed-position overlay anchoring so parent transforms / stacking
// contexts (backdrop-filter, transform) never clip the open panel.

let activeSelect = null;
let activeDrop   = null;

/** Re-position the floating panel against its trigger rect */
function positionDrop(panel, triggerEl) {
  const tr  = triggerEl.getBoundingClientRect();
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const GAP = 4;

  // ── Width ────────────────────────────────────────────────────
  // Pin to trigger width first so the panel wraps text correctly
  // before we measure its height. Allow up to viewport − 16px.
  const targetW = Math.min(
    Math.max(tr.width, 140),      // at least 140px for readability
    vw - 16                       // never wider than viewport
  );
  panel.style.width    = targetW + 'px';
  panel.style.minWidth = tr.width + 'px';
  panel.style.maxWidth = (vw - 16) + 'px';

  // ── Height (measured AFTER width is set) ─────────────────────
  const ph = panel.scrollHeight;

  // ── Horizontal: align left edge with trigger, clamp to viewport
  let left = tr.left;
  if (left + targetW > vw - 8) left = Math.max(8, vw - targetW - 8);

  // ── Vertical: prefer below, flip above if clipped ────────────
  let top;
  let openUpward = false;
  if (tr.bottom + GAP + ph > vh - 8 && tr.top - GAP - ph > 8) {
    top        = tr.top - GAP - ph;
    openUpward = true;
  } else {
    top = tr.bottom + GAP;
  }

  panel.style.position  = 'fixed';
  panel.style.top       = top  + 'px';
  panel.style.left      = left + 'px';
  panel.style.maxHeight = (openUpward
    ? tr.top  - GAP - 8
    : vh - tr.bottom - GAP - 8) + 'px';
  panel.dataset.upward  = openUpward ? '1' : '0';
}

/** Open a specific select */
function openSelect(sel) {
  closeActive();

  const trigger  = sel.querySelector('.custom-select-trigger');
  const dropdown = sel.querySelector('.custom-select-dropdown');
  if (!trigger || !dropdown) return;

  // Detach panel from DOM flow → append to body so it escapes all
  // stacking contexts (backdrop-filter, transform, overflow:hidden …)
  document.body.appendChild(dropdown);
  dropdown.style.removeProperty('right'); // let positionDrop control width

  positionDrop(dropdown, trigger);

  sel.classList.add('open');
  dropdown.classList.add('open');
  dropdown.style.opacity    = '1';
  dropdown.style.visibility = 'visible';
  dropdown.style.transform  = 'scale(1) translateY(0)';
  dropdown.style.pointerEvents = 'auto';

  activeSelect = sel;
  activeDrop   = dropdown;

  // Reposition on scroll / resize (debounced)
  window._dropScrollHandler = () => positionDrop(dropdown, trigger);
  window.addEventListener('scroll', window._dropScrollHandler, { passive: true, capture: true });
  window.addEventListener('resize', window._dropScrollHandler, { passive: true });
}

/** Close whatever is open and return panel to its original parent */
function closeActive() {
  if (!activeSelect) return;

  const sel  = activeSelect;
  const drop = activeDrop;

  sel.classList.remove('open');
  if (drop) {
    drop.classList.remove('open');
    drop.style.opacity       = '';
    drop.style.visibility    = '';
    drop.style.transform     = '';
    drop.style.pointerEvents = '';
    drop.style.position      = '';
    drop.style.top           = '';
    drop.style.left          = '';
    drop.style.width         = '';
    drop.style.minWidth      = '';
    drop.style.maxHeight     = '';
    // Return to original parent (the .custom-select element)
    sel.appendChild(drop);
  }

  window.removeEventListener('scroll', window._dropScrollHandler, { capture: true });
  window.removeEventListener('resize', window._dropScrollHandler);
  activeSelect = null;
  activeDrop   = null;
}

export function initCustomSelects() {
  document.querySelectorAll('.custom-select').forEach(sel => {
    if (sel.dataset.initialized === 'true') return;
    sel.dataset.initialized = 'true';

    const trigger  = sel.querySelector('.custom-select-trigger');
    const dropdown = sel.querySelector('.custom-select-dropdown');
    if (!trigger || !dropdown) return;

    // Initial closed state (CSS may not yet apply to body-appended panel)
    dropdown.style.opacity       = '0';
    dropdown.style.visibility    = 'hidden';
    dropdown.style.pointerEvents = 'none';
    dropdown.style.transform     = 'scale(0.97) translateY(-4px)';
    dropdown.style.transition    = 'opacity 0.2s ease, transform 0.2s ease, visibility 0.2s';

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (sel.classList.contains('open')) {
        closeActive();
      } else {
        openSelect(sel);
      }
    });

    sel.querySelectorAll('.select-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        sel.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const txt = sel.querySelector('.selected-text');
        if (txt) txt.textContent = opt.textContent.trim();
        sel.dataset.value = opt.dataset.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        closeActive();
      });
    });
  });

  // Global click-outside to close
  document.addEventListener('click', e => {
    if (activeSelect && !activeSelect.contains(e.target) && !activeDrop?.contains(e.target)) {
      closeActive();
    }
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeSelect) closeActive();
  });
}

export function getSelectValue(id) {
  const sel = document.getElementById(id);
  if (!sel) return '';
  const active = sel.querySelector('.select-option.active');
  return active ? active.dataset.value : '';
}

export function setSelectValue(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.querySelectorAll('.select-option').forEach(o => {
    const isActive = o.dataset.value === value;
    o.classList.toggle('active', isActive);
  });
  const txt = sel.querySelector('.selected-text');
  if (txt) {
    const active = sel.querySelector('.select-option.active');
    if (active) txt.textContent = active.textContent.trim();
  }
  sel.dataset.value = value;
}
