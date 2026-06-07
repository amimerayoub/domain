/**
 * Replaces the entire SEO CSS block in styles.css with the premium redesign.
 */
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Find start marker
const startMarker = '/* ============================================================\r\n   SEO DOCUMENTATION SECTION';
const startIdx = css.indexOf(startMarker);
if (startIdx === -1) {
  // try with LF
  const startMarker2 = '/* ============================================================\n   SEO DOCUMENTATION SECTION';
  const si2 = css.indexOf(startMarker2);
  if (si2 === -1) { console.error('Start marker not found'); process.exit(1); }
}

const actualStart = css.indexOf('/* ===', 157800); // approx position
console.log('actualStart:', actualStart);

// Just replace everything from startIdx to end of file
const beforeSeo = css.slice(0, actualStart);

const newSeoCss = `/* ============================================================
   SEO DOCUMENTATION SECTION — Premium Redesign
   ============================================================ */

/* ── Outer shell ─────────────────────────────────────────── */
.seo-content-section {
  display: none;
  margin: 0 auto 56px auto;
  max-width: 960px;
  padding: 0 20px;
  font-family: var(--font-primary);
  box-sizing: border-box;
  width: 100%;
}

.seo-content-section.active { display: block; }
.seo-tool-content           { display: none; }
.seo-tool-content.active    { display: block; }

/* ── Separator between tool UI and documentation ─────────── */
.seo-doc-sep {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 28px 0;
}

.seo-doc-sep-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.seo-doc-sep-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-card);
}

.seo-doc-sep-label svg {
  color: var(--primary);
  flex-shrink: 0;
}

/* ── Main documentation card ─────────────────────────────── */
.seo-doc-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* ── Card Header ─────────────────────────────────────────── */
.seo-doc-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 28px 32px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
}

.seo-doc-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  border-radius: 12px;
  color: var(--primary);
}

.seo-doc-title {
  font-family: var(--font-heading);
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.seo-doc-subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin: 0;
}

/* ── Section layout ──────────────────────────────────────── */
.seo-doc-section {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 0 32px;
  padding: 32px;
}

.seo-doc-rule {
  height: 1px;
  background: var(--border);
  margin: 0;
}

/* ── Section labels (numbered sidebar) ───────────────────── */
.seo-section-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}

.seo-section-num {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.seo-section-heading {
  font-family: var(--font-primary);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  line-height: 1.4;
}

/* ── Section body ────────────────────────────────────────── */
.seo-section-body { min-width: 0; }

/* ── Body paragraphs ─────────────────────────────────────── */
.seo-p {
  font-size: 0.93rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0 0 14px 0;
}

.seo-p:last-child { margin-bottom: 0; }

/* ── Feature icon grid ───────────────────────────────────── */
.seo-feat-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.seo-feat-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
}

.seo-feat-item:hover {
  border-color: var(--primary-border);
  box-shadow: 0 2px 10px var(--primary-glow);
  transform: translateY(-1px);
}

.seo-feat-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  background: var(--success-bg);
  color: var(--success);
  margin-top: 1px;
  flex-shrink: 0;
}

.seo-feat-label {
  font-size: 0.845rem;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1.5;
}

/* ── FAQ Accordion ───────────────────────────────────────── */
.seo-faq-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seo-faq-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-soft);
  overflow: hidden;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.seo-faq-item[open] {
  border-color: var(--primary-border);
  background: var(--bg-card);
  box-shadow: 0 2px 12px var(--primary-glow);
}

.seo-faq-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  transition: background var(--transition);
}

.seo-faq-trigger::-webkit-details-marker { display: none; }
.seo-faq-trigger:hover { background: var(--bg-soft2); }

.seo-faq-q-text { flex: 1; }

.seo-faq-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 6px;
  background: var(--bg-soft2);
  color: var(--text-muted);
  transition: background var(--transition), color var(--transition), transform var(--transition);
  flex-shrink: 0;
}

.seo-faq-item[open] .seo-faq-chevron {
  background: var(--primary-light);
  color: var(--primary);
  transform: rotate(180deg);
}

.seo-faq-body {
  padding: 12px 16px 14px 16px;
  border-top: 1px solid var(--border);
}

.seo-faq-body .seo-p {
  font-size: 0.88rem;
  line-height: 1.75;
  margin: 0;
}

/* ── Related intro text ──────────────────────────────────── */
.seo-related-intro { margin-bottom: 14px !important; }

/* ── Related Tools pill links ────────────────────────────── */
.seo-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seo-pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.18s ease;
  white-space: nowrap;
  cursor: pointer;
}

.seo-pill:hover {
  background: var(--primary-light);
  border-color: var(--primary-border);
  color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 14px var(--primary-glow);
}

/* ── Legacy class aliases (backward compat for static pages) */
.seo-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.seo-inner { padding: 0; }
.seo-block { padding: 32px; }
.seo-divider { height: 1px; background: var(--border); }
.seo-h2 { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin: 0 0 16px; }
.seo-title-h2 { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin: 0 0 16px; }
.seo-paragraph { font-size: 0.93rem; color: var(--text-secondary); line-height: 1.8; margin: 0 0 12px; }
.seo-paragraph:last-child { margin-bottom: 0; }
.seo-feature-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.seo-feature-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 10px; transition: all var(--transition); }
.seo-feature-item:hover { border-color: var(--primary-border); transform: translateY(-1px); }
.seo-feature-icon { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; min-width: 20px; border-radius: 50%; background: var(--success-bg); color: var(--success); font-size: 0.7rem; font-weight: 800; flex-shrink: 0; }
.seo-feature-text { font-size: 0.845rem; font-weight: 500; color: var(--text-main); line-height: 1.5; }
.seo-faq-list { display: flex; flex-direction: column; gap: 8px; }
.seo-faq-accordion { border: 1px solid var(--border); border-radius: 10px; background: var(--bg-soft); overflow: hidden; transition: border-color var(--transition); }
.seo-faq-accordion[open] { border-color: var(--primary-border); background: var(--bg-card); }
.seo-faq-question { padding: 14px 16px; font-size: 0.9rem; font-weight: 600; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; list-style: none; user-select: none; }
.seo-faq-question::-webkit-details-marker { display: none; }
.seo-faq-question:hover { background: var(--bg-soft2); }
.faq-icon { width: 16px !important; height: 16px !important; min-width: 16px; max-width: 16px; color: var(--text-muted); transition: transform var(--transition); flex-shrink: 0; }
.seo-faq-accordion[open] .faq-icon { transform: rotate(180deg); color: var(--primary); }
.seo-faq-answer { padding: 12px 16px 14px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.7; border-top: 1px solid var(--border); }
.seo-related-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.seo-related-link { display: inline-flex; align-items: center; padding: 7px 16px; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-soft); border: 1px solid var(--border); border-radius: 20px; text-decoration: none; transition: all 0.18s ease; white-space: nowrap; cursor: pointer; }
.seo-related-link:hover { background: var(--primary-light); border-color: var(--primary-border); color: var(--primary); transform: translateY(-2px); }

/* ── Tablet ──────────────────────────────────────────────── */
@media (max-width: 900px) {
  .seo-content-section { max-width: 100%; padding: 0 16px; }
  .seo-doc-section { grid-template-columns: 1fr; gap: 16px; padding: 24px; }
  .seo-section-label { flex-direction: row; align-items: center; gap: 10px; padding-top: 0; }
  .seo-doc-header { padding: 20px 24px; }
  .seo-feat-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 560px) {
  .seo-content-section { margin-bottom: 36px; padding: 0 12px; }
  .seo-doc-section { padding: 20px; }
  .seo-doc-header { padding: 16px 20px; gap: 12px; }
  .seo-doc-header-icon { width: 40px; height: 40px; min-width: 40px; }
  .seo-doc-title { font-size: 1.2rem; }
  .seo-feat-grid { grid-template-columns: 1fr; }
  .seo-doc-sep { margin: 28px 0 20px; }
}
`;

// Write from before the old SEO block to end of file
const result = beforeSeo + newSeoCss;
fs.writeFileSync(cssPath, result, 'utf8');
console.log('✓ styles.css SEO block replaced. Final length:', result.length);
