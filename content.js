'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
const processedInputs = new WeakSet();

// Map UI labels → background.js prompt keys (keeps background.js untouched)
const TONE_MAP = {
  'Casual':    'Texting',
  'Work Chat': 'Work Chat',
  'Formal':    'Corporate',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let toast = document.getElementById('ts-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ts-toast';
    document.body.appendChild(toast);
  }
  toast.className = `ts-toast-visible ${type}`;
  toast.textContent = message;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, 3000);
}

// ── Container finder (platform-aware) ────────────────────────────────────────
function findContainer(inputEl) {
  const host = window.location.hostname;

  if (host.includes('mail.google.com')) {
    return inputEl.closest('.aO7') || inputEl.closest('.Am') || inputEl.parentElement;
  }
  if (host.includes('slack.com')) {
    return inputEl.closest('.c-texty_input_unstyled')
      || inputEl.closest('[data-qa="texty_input"]')
      || inputEl.closest('[class*="texty"]')
      || inputEl.parentElement;
  }
  if (host.includes('linkedin.com')) {
    return inputEl.closest('.msg-form__msg-content-container')
      || inputEl.closest('.msg-form__container')
      || inputEl.parentElement;
  }
  // WhatsApp Web + fallback
  return inputEl.parentElement;
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function readText(inputEl) {
  return (inputEl.innerText || inputEl.textContent || '').trim();
}

function replaceText(inputEl, newText) {
  inputEl.focus();
  const inserted = document.execCommand('selectAll', false, null)
    && document.execCommand('insertText', false, newText);
  if (!inserted || readText(inputEl) !== newText.trim()) {
    inputEl.textContent = newText;
  }
  ['input', 'change'].forEach(evt =>
    inputEl.dispatchEvent(new Event(evt, { bubbles: true }))
  );
  inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

// ── Button state manager ──────────────────────────────────────────────────────
function setButtonState(btn, state) {
  btn.setAttribute('data-state', state);
  btn.disabled = false;
  switch (state) {
    case 'default':
      btn.textContent = 'ToneShift';
      break;
    case 'loading':
      btn.textContent = 'Converting';
      btn.disabled = true;
      break;
    case 'undo':
      btn.textContent = 'Undo';
      break;
    case 'error':
      btn.textContent = 'ToneShift';
      break;
  }
}

// ── Popover builder ───────────────────────────────────────────────────────────
function buildPopover(inputEl, btn) {
  const popover = document.createElement('div');
  popover.className = 'ts-popover ts-hidden';

  const toneOptions = [
    { label: 'Casual',    active: false },
    { label: 'Work Chat', active: true  },
    { label: 'Formal',    active: false },
  ];

  toneOptions.forEach(({ label, active }) => {
    const row = document.createElement('div');
    row.className = 'ts-popover-option' + (active ? ' ts-popover-option--active' : '');
    row.textContent = label;
    row.addEventListener('click', () => {
      popover.classList.add('ts-hidden');
      runConversion(label, inputEl, btn);
    });
    popover.appendChild(row);
  });

  const divider = document.createElement('div');
  divider.className = 'ts-popover-divider';
  popover.appendChild(divider);

  const decodeRow = document.createElement('div');
  decodeRow.className = 'ts-popover-option ts-decode-row';
  decodeRow.textContent = 'Decode';
  decodeRow.addEventListener('click', () => {
    popover.classList.add('ts-hidden');
    runConversion('DECODE', inputEl, btn);
  });
  popover.appendChild(decodeRow);

  return popover;
}

// ── Conversion flow ───────────────────────────────────────────────────────────
function runConversion(uiTone, inputEl, btn) {
  if (!window.chrome?.runtime?.id) {
    showToast('Extension reloaded. Please refresh.', 'error');
    return;
  }

  const text = readText(inputEl);
  if (text.length < 10) {
    showToast('Type more before converting', 'error');
    return;
  }

  const originalText = text;
  const isDecodeMode = uiTone === 'DECODE';
  const msgType   = isDecodeMode ? 'TONAL_DECODE' : 'TONAL_CONVERT';
  const toneLevel = isDecodeMode ? null : (TONE_MAP[uiTone] || 'Work Chat');

  setButtonState(btn, 'loading');

  chrome.storage.sync.get(['apiKey'], (data) => {
    chrome.runtime.sendMessage(
      { type: msgType, text, toneLevel, apiKey: data.apiKey },
      (response) => {
        if (response?.success) {
          replaceText(inputEl, response.text);
          setButtonState(btn, 'undo');
          btn._originalText = originalText;

          // Auto-reset after 3 seconds
          clearTimeout(btn._undoTimer);
          btn._undoTimer = setTimeout(() => {
            if (btn.getAttribute('data-state') === 'undo') setButtonState(btn, 'default');
          }, 3000);

          // Reset on next keystroke
          const resetOnType = () => {
            if (btn.getAttribute('data-state') === 'undo') {
              setButtonState(btn, 'default');
              inputEl.removeEventListener('input', resetOnType);
            }
          };
          inputEl.addEventListener('input', resetOnType);
        } else {
          setButtonState(btn, 'error');
          showToast(response?.error || 'Connection issue. Check your internet.', 'error');
        }
      }
    );
  });
}

// ── Main injection ────────────────────────────────────────────────────────────
function injectButton(inputEl) {
  if (!window.chrome?.runtime?.id) return;
  if (processedInputs.has(inputEl)) return;
  processedInputs.add(inputEl);
  inputEl.dataset.tsInjected = 'true';

  const container = findContainer(inputEl);
  if (!container || container === document.body || container === document.documentElement) return;

  // Ensure container hosts absolute children
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const btn = document.createElement('button');
  btn.className = 'ts-btn';
  btn.textContent = 'ToneShift';
  btn.setAttribute('data-state', 'default');

  const popover = buildPopover(inputEl, btn);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Undo action
    if (btn.getAttribute('data-state') === 'undo') {
      if (btn._originalText !== undefined) replaceText(inputEl, btn._originalText);
      clearTimeout(btn._undoTimer);
      setButtonState(btn, 'default');
      return;
    }
    // Toggle popover
    const wasHidden = popover.classList.contains('ts-hidden');
    document.querySelectorAll('.ts-popover').forEach(p => p.classList.add('ts-hidden'));
    if (wasHidden) popover.classList.remove('ts-hidden');
  });

  // Close popover on outside click
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== btn) {
      popover.classList.add('ts-hidden');
    }
  });

  container.appendChild(btn);
  container.appendChild(popover);
}

// ── Selectors + Observer ──────────────────────────────────────────────────────
const SELECTORS = [
  'div[aria-label="Message Body"]',
  '.Am.Al.editable',
  '.ql-editor[data-placeholder]',
  '[data-lexical-editor="true"]',
  '.p-rich_text_input__editable',
  '.msg-form__contenteditable',
  'div[aria-label="Write a message..."]',
  'div[contenteditable="true"][data-tab="10"]',
  'div[contenteditable="true"][title="Type a message"]',
  '#main div[contenteditable="true"]',
].join(', ');

function scanAndInject() {
  document.querySelectorAll(SELECTORS).forEach((el) => {
    if (el.isContentEditable && !el.dataset.tsInjected) injectButton(el);
  });
}

function initObserver() {
  scanAndInject();
  new MutationObserver(scanAndInject).observe(document.body, { childList: true, subtree: true });
}

setTimeout(initObserver, 1500);

// ── Selection Decode (for received messages, outside inputs) ──────────────────
let decodeFloat = null;
let decodeCard  = null;

function removeDecodeUI() {
  decodeFloat?.remove(); decodeFloat = null;
  decodeCard?.remove();  decodeCard  = null;
}

function isInsideEditable(node) {
  while (node) {
    if (node.nodeType === 1 && (node.isContentEditable || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) return true;
    node = node.parentNode;
  }
  return false;
}

function showDecodeFloat(selection) {
  const range = selection.getRangeAt(0);
  const rect  = range.getBoundingClientRect();

  decodeFloat = document.createElement('button');
  decodeFloat.className   = 'ts-decode-float';
  decodeFloat.textContent = 'Decode';
  decodeFloat.style.top   = `${rect.bottom + window.scrollY + 5}px`;
  decodeFloat.style.left  = `${Math.max(8, rect.right - 60)}px`;

  decodeFloat.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) return;
    if (!window.chrome?.runtime?.id) {
      showToast('Extension reloaded. Please refresh.', 'error');
      return;
    }
    decodeFloat.textContent = 'Decoding...';
    chrome.storage.sync.get(['apiKey'], (data) => {
      chrome.runtime.sendMessage(
        { type: 'TONAL_DECODE', text: selectedText, apiKey: data.apiKey },
        (response) => {
          if (response?.success) showDecodeCard(response.text, rect);
          else { showToast(response?.error || 'Decoding failed', 'error'); removeDecodeUI(); }
        }
      );
    });
  });

  document.body.appendChild(decodeFloat);
}

function showDecodeCard(decodedText, rect) {
  decodeFloat?.remove(); decodeFloat = null;

  decodeCard = document.createElement('div');
  decodeCard.className  = 'ts-decode-card';
  decodeCard.style.top  = `${rect.bottom + window.scrollY + 10}px`;
  decodeCard.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - 340))}px`;

  const content = document.createElement('div');
  content.className   = 'ts-decode-content';
  content.textContent = decodedText;

  const copyBtn = document.createElement('button');
  copyBtn.className   = 'ts-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(decodedText).then(() => {
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
  });

  decodeCard.appendChild(content);
  decodeCard.appendChild(copyBtn);
  document.body.appendChild(decodeCard);
}

document.addEventListener('mouseup', (e) => {
  if (e.target.closest('.ts-decode-card') || e.target.closest('.ts-decode-float')) return;
  setTimeout(() => {
    const sel  = window.getSelection();
    const text = sel?.toString().trim() || '';
    if (text.length >= 20 && !isInsideEditable(sel.anchorNode)) {
      removeDecodeUI();
      showDecodeFloat(sel);
    } else if (!e.target.closest('.ts-decode-card')) {
      removeDecodeUI();
    }
  }, 10);
});

document.addEventListener('click', (e) => {
  if (decodeCard && !e.target.closest('.ts-decode-card')) removeDecodeUI();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removeDecodeUI();
});
