/**
 * Lazy module loader registry
 * Caches and manages dynamic module imports
 */
const _loaded = {};

/**
 * Lazy load a module and cache the promise/result
 * @param {string} key - Unique key for the module
 * @param {Function} importFn - A function returning a dynamic import promise, e.g. () => import('./myModule.js')
 * @returns {Promise<any>} The loaded module exports
 */
export async function lazyLoad(key, importFn) {
  if (!_loaded[key]) {
    _loaded[key] = importFn();
  }
  return _loaded[key];
}
