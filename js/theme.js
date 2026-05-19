/**
 * js/theme.js — Centralized theme management for AI Domains
 *
 * Single source of truth for light/dark mode across ALL pages.
 * - Storage key:  localStorage.theme  ('light' | 'dark')
 * - Default:      'light'
 * - Applies:      data-theme attribute  → used by dark-theme.css / index.html
 *                 .dark class on <html> → used by Tailwind (landing, blog, etc.)
 *
 * Usage:
 *   import { initTheme, toggleTheme, getTheme } from './theme.js';
 *   initTheme();          // call once on page load
 *   toggleTheme();        // flip between light ↔ dark
 *   getTheme();           // returns 'light' | 'dark'
 */

const STORAGE_KEY = 'theme';
const DEFAULT     = 'light';

/** Read saved theme, fallback to DEFAULT (never reads system preference) */
export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT;
}

/** Apply theme to document root — works for both CSS systems */
export function applyTheme(theme) {
  const html = document.documentElement;
  // 1. data-theme attribute (dark-theme.css, index.html)
  html.setAttribute('data-theme', theme);
  // 2. Tailwind dark class (landing.html, blog.html, etc.)
  html.classList.toggle('dark', theme === 'dark');
  // 3. Body class (legacy compat with main.js)
  document.body?.classList.remove('dark', 'light');
  document.body?.classList.add(theme);
}

/** Save and apply a theme */
export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  dispatchThemeEvent(theme);
}

/** Toggle between light and dark */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Dispatch a custom event so any page can react to changes */
function dispatchThemeEvent(theme) {
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Initialize theme on page load.
 * Reads saved preference (default: light), applies it, and
 * optionally hooks up all toggle buttons matching the selector.
 *
 * @param {string} [toggleSelector='#themeToggle,#theme-toggle']
 */
export function initTheme(toggleSelector = '#themeToggle, #theme-toggle') {
  // Migrate old domainTheme key → unified key
  const legacy = localStorage.getItem('domainTheme');
  if (legacy && !localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem('domainTheme');
  }

  applyTheme(getTheme());

  // Bind all toggle buttons found by selector
  document.querySelectorAll(toggleSelector).forEach(btn => {
    btn.addEventListener('click', () => {
      const next = toggleTheme();
      syncToggleIcons(next);
    });
  });

  // Sync initial icon state
  syncToggleIcons(getTheme());
}

/** Update moon/sun icons on theme toggle buttons */
function syncToggleIcons(theme) {
  document.querySelectorAll('[data-theme-icon-sun]').forEach(el => {
    el.style.display = theme === 'dark' ? '' : 'none';
  });
  document.querySelectorAll('[data-theme-icon-moon]').forEach(el => {
    el.style.display = theme === 'dark' ? 'none' : '';
  });
}
