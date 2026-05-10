/**
 * Tonal Sandbox Adapter
 * Handles the Studio Laboratory environment
 */

window.TonalAdapters = window.TonalAdapters || {};

window.TonalAdapters.sandbox = {
  id: 'sandbox',
  
  matches: (url) => url.includes('sandbox.html') || url.includes('tonal-design-system'),

  selectors: [
    '.mock-li-input',
    '.mock-sl-input',
    '.mock-gm-body',
    '.mock-wa-input',
    '.linkedin-mock [contenteditable="true"]',
    '.slack-mock [contenteditable="true"]',
    '.gmail-mock [contenteditable="true"]',
    '.whatsapp-mock [contenteditable="true"]'
  ],

  isValid(el) {
    // In sandbox, we allow almost everything except the search bar
    return !el.classList.contains('search-bar');
  },

  getOffsets(el) {
    // Standardize to the Elite Offset {8, 8} across all mocks
    return { x: 8, y: 8 };
  },

  insertText(input, text, isRichText = false) {
    input.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
};
