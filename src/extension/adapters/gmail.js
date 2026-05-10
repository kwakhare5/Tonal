/**
 * Tonal Gmail Adapter
 * Handles: Compose Window, Reply Area, Inline Replies
 */

window.TonalAdapters = window.TonalAdapters || {};

window.TonalAdapters.gmail = {
  id: 'gmail',
  
  matches: (url) => url.includes('mail.google.com'),

  selectors: [
    '[role="textbox"][aria-label*="Message"]', // Compose body
    '.editable[contenteditable="true"]', // Reply area
    '.Am.Al.editable' // Class-based fallback for classic UI
  ],

  isValid(el) {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    if (label.includes('search') || name === 'q') return false;
    if (label.includes('to') || label.includes('cc') || label.includes('subject')) return false;
    return label.includes('message') || el.classList.contains('editable');
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
  }
};
