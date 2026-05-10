/**
 * Tonal Default Adapter
 * Fallback for unknown platforms or general testing
 */

window.TonalAdapters = window.TonalAdapters || {};

window.TonalAdapters.default = {
  id: 'default',
  
  matches: () => true, // Always matches as fallback

  selectors: [
    '[contenteditable="true"]',
    'textarea'
  ],

  isValid(el) {
    // Basic heuristic: not a search bar and tall enough
    const text = (el.getAttribute('aria-label') || el.placeholder || el.id || '').toLowerCase();
    const isSearch = text.includes('search') || text.includes('query');
    return !isSearch && el.offsetHeight > 30;
  },

  getOffsets(el) {
    return { x: 8, y: 8 };
  },

  getValue(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || "";
    return (el.innerText || el.textContent || "").trim();
  },

  insertText(input, text, isRichText = false) {
    input.focus();
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
};
