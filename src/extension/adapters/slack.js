/**
 * Tonal Slack Adapter
 * Handles: Channel Chat, Direct Messages, Thread Replies
 */

window.TonalAdapters = window.TonalAdapters || {};

window.TonalAdapters.slack = {
  id: 'slack',
  
  matches: (url) => url.includes('slack.com'),

  selectors: [
    '.ql-editor[contenteditable="true"]', // Main Slack Quill editor
    '[data-qa="reply_container"] .ql-editor', // Thread sidebar
    '[data-qa="message_editor"] .ql-editor', // Editing messages
    '[aria-label*="Message"]' // Generic fallback for message areas
  ],

  isValid(el) {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('jump to') || label.includes('search')) return false;
    return label.includes('message') || el.closest('.p-message_input');
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
    // Slack specific: trigger events so the Quill editor updates its state
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' })); // Force update
  }
};
