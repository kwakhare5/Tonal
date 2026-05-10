/**
 * Tonal WhatsApp Adapter
 * Handles: Main Chat Input
 */

window.TonalAdapters = window.TonalAdapters || {};

window.TonalAdapters.whatsapp = {
  id: 'whatsapp',
  
  matches: (url) => url.includes('whatsapp.com'),

  selectors: [
    '#main [contenteditable="true"]', // Main chat bubble
    '[data-tab="10"]', // Specific data attribute for WhatsApp input
    'footer [contenteditable="true"]' // Container-based fallback
  ],

  isValid(el) {
    const isInMain = el.closest('#main') || el.closest('footer');
    const isSmall = el.offsetHeight < 30;
    return isInMain && !isSmall;
  },

  getOffsets(el) {
    return { x: 8, y: 8 };
  },

  getValue(el) {
    return (el.innerText || el.textContent || "").trim();
  },

  insertText(input, text, isRichText = false) {
    input.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    // WhatsApp specific: trigger input event
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
};
