/**
 * TONAL CONTENT INJECTOR v4.8.0
 * Ultra-Lean | Inside-the-Box Docking | State-Driven
 * BACKEND: Restored real AI communication
 */

(function() {
  const UI = window.Tonal;
  const SHADOW_ID = 'tonal-v4-root';
  const SELECTORS = ['[contenteditable="true"]', 'textarea', '[role="textbox"]', '.ql-editor'].join(',');
  const WORKER_URL = "https://tonal-proxy.kwakhare5.workers.dev";

  class TonalInjector {
    constructor() {
      this.registry = new Map(); // input -> { wrap, state, tone, popover, originalText }
      this.decodeUI = { button: null, card: null, selectedText: '', selectedRect: null };
      this.defaultTone = 'workChat'; // Fallback
      
      this.initStorage();
      this.initObservers();
      this.init();
      
      // Global listeners
      document.addEventListener('click', (e) => this.dismissPopovers(e.target));
      document.addEventListener('selectionchange', () => this.handleSelection());
    }

    initObservers() {
      this.resizeObserver = new ResizeObserver(() => this.requestPositionUpdate());
      
      const onScrollOrResize = () => this.requestPositionUpdate();
      window.addEventListener('resize', onScrollOrResize, { passive: true });
      document.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
    }

    requestPositionUpdate() {
      if (!this._updatePending) {
        this._updatePending = true;
        requestAnimationFrame(() => {
          this.updatePositions();
          this._updatePending = false;
        });
      }
    }

    initStorage() {
      if (!window.chrome || !chrome.storage) return;
      
      // Load initial
      chrome.storage.sync.get({ defaultTone: 'workChat' }, (settings) => {
        this.defaultTone = settings.defaultTone;
      });

      // Listen for popup changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.defaultTone) {
          this.defaultTone = changes.defaultTone.newValue;
          // Update any resting pills
          for (const [input, e] of this.registry.entries()) {
            if (e.state === 'rest') {
              e.tone = this.defaultTone;
              this.render(input);
            }
          }
        }
      });
    }

    handleSelection() {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0 && !this.decodeUI.card) {
        this.decodeUI.selectedText = text;
        this.decodeUI.selectedRect = selection.getRangeAt(0).getBoundingClientRect();
        this.showDecodeButton();
      } else if (text.length === 0) {
        this.hideDecodeButton();
      }
    }

    showDecodeButton() {
      const rect = this.decodeUI.selectedRect;
      if (!rect) return;

      if (!this.decodeUI.button) {
        this.decodeUI.button = UI.createDecodeButton(() => {
          this.decodeText();
        });
        this.getShadow().appendChild(this.decodeUI.button);
      }
      
      const btn = this.decodeUI.button;
      const safeRect = this.getSafeRect(rect);
      
      btn.style.left = `${safeRect.left + safeRect.width/2 - 35}px`;
      btn.style.top = `${safeRect.top - 40}px`;
      btn.style.display = 'block';
      requestAnimationFrame(() => btn.classList.add('decode-float--active'));
    }

    hideDecodeButton() {
      if (this.decodeUI.button) {
        this.decodeUI.button.classList.remove('decode-float--active');
        setTimeout(() => { if (this.decodeUI.button) this.decodeUI.button.style.display = 'none'; }, 300);
      }
    }

    async decodeText() {
      const rect = this.decodeUI.selectedRect;
      const text = this.decodeUI.selectedText;
      if (!rect || !text) return;
      
      this.hideDecodeButton();
      UI.showToast(this.getShadow(), 'Decoding...', 'info');

      try {
        const result = await this.callAI(text, 'decode');
        this.showDecodeCard(result, rect);
      } catch (err) {
        UI.showToast(this.getShadow(), 'Decode failed', 'error');
      }
    }

    async callAI(text, mode, toneLevel = 'workChat') {
      return new Promise((resolve, reject) => {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: mode === 'decode' ? "TONESHIFT_DECODE" : "TONESHIFT_CONVERT",
            text,
            toneLevel
          }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) reject(response?.error || 'AI Offline');
            else resolve(response.text);
          });
        } else {
          // Direct fetch for sandbox
          fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, toneLevel, mode })
          })
          .then(r => r.json())
          .then(d => d.success ? resolve(d.text) : reject(d.error))
          .catch(reject);
        }
      });
    }

    showDecodeCard(resultText, rect) {
      if (this.decodeUI.card) this.decodeUI.card.remove();
      
      this.decodeUI.card = UI.createDecodeCard(resultText, () => {
        this.decodeUI.card.classList.remove('decode-card--active');
        setTimeout(() => { this.decodeUI.card.remove(); this.decodeUI.card = null; }, 400);
      });

      const shadow = this.getShadow();
      
      // Calculate precise viewport coordinates relative to host
      const safeRect = this.getSafeRect(rect);
      const finalLeft = safeRect.left + safeRect.width / 2 - 35;
      const finalTop = safeRect.top - 40;

      // Force absolute positioning inside our fixed full-screen host
      Object.assign(this.decodeUI.card.style, {
        position: 'absolute',
        left: `${finalLeft}px`,
        top: `${finalTop}px`,
        display: 'block'
      });
      
      shadow.appendChild(this.decodeUI.card);
      requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
    }

    dismissPopovers(target) {
      // Dismiss tone popovers
      for (const entry of this.registry.values()) {
        if (entry.popover && !entry.wrap.contains(target)) {
          entry.popover = false;
          if (!entry.isMouseOver) entry.state = 'rest';
          this.render(entry.input);
        }
      }
      // Dismiss decode card if clicking outside
      if (this.decodeUI.card && !this.decodeUI.card.contains(target)) {
        this.decodeUI.card.classList.remove('decode-card--active');
        const card = this.decodeUI.card;
        setTimeout(() => { if (card.parentNode) card.remove(); }, 400);
        this.decodeUI.card = null;
      }
    }

    init() {
      const scan = () => {
        const elements = document.querySelectorAll(SELECTORS);
        elements.forEach(el => {
          if (el.dataset.tonal || (el.offsetWidth === 0 && el.offsetHeight === 0)) return;
          el.dataset.tonal = "v4";
          this.register(el);
        });
      };

      scan(); 
      setInterval(scan, 1500);
      document.addEventListener('DOMContentLoaded', scan);
      window.addEventListener('load', scan);
      this.requestPositionUpdate();
    }

    getShadow() {
      let host = document.getElementById(SHADOW_ID);
      if (!host) {
        if (!document.querySelector('link[href*="DM+Sans"]')) {
          const font = document.createElement('link');
          font.rel = 'stylesheet';
          font.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap';
          document.head.appendChild(font);
        }
        host = UI.h('div', { 
          id: SHADOW_ID, 
          style: 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647; pointer-events:none; border:none; margin:0; padding:0;' 
        });
        document.body.appendChild(host);
      }
      if (!host.shadowRoot) {
        const shadow = host.attachShadow({ mode: 'open' });
        UI.injectStyles(shadow);
        shadow.addEventListener('click', (e) => this.dismissPopovers(e.target));
        return shadow;
      }
      return host.shadowRoot;
    }

    getSafeRect(rect) {
      const host = document.getElementById(SHADOW_ID);
      if (!host) return rect;
      const hRect = host.getBoundingClientRect();
      
      // Account for Visual Viewport offsets (Zoom/DPI)
      const vv = window.visualViewport;
      const vx = vv ? vv.offsetLeft : 0;
      const vy = vv ? vv.offsetTop : 0;

      return {
        left: rect.left - hRect.left + vx,
        top: rect.top - hRect.top + vy,
        width: rect.width,
        height: rect.height
      };
    }

    register(input) {
      const shadow = this.getShadow();
      const wrap = UI.h('div', { 
        className: 't-wrap',
        style: 'position:absolute; pointer-events:auto; display:flex; align-items:center; justify-content:flex-end; width:200px; height:32px;' 
      });
      shadow.appendChild(wrap);

      const entry = { 
        input,
        wrap, 
        shadow, 
        state: 'rest', 
        tone: this.defaultTone, 
        popover: false,
        originalText: '',
        pill: null,
        pop: null
      };
      this.registry.set(input, entry);
      this.resizeObserver.observe(input);
      this.render(input);
      this.requestPositionUpdate();
    }

    render(input) {
      const e = this.registry.get(input);
      if (!e) return;

      if (!e.pill) {
        e.pill = UI.h('div', { className: 't-pill' });
        e.wrap.appendChild(e.pill);
      }

      if (e.lastState !== e.state || e.lastTone !== e.tone) {
        UI.renderPill(e.pill, e.state, e.tone, {
          onClick: () => {
            if (e.state === 'rest') { e.state = 'expanded'; this.render(input); }
            else if (e.state === 'expanded') this.convert(input);
            else if (e.state === 'done') this.undo(input);
          },
          onTogglePopover: () => { 
            e.popover = !e.popover; 
            if (!e.popover && !e.isMouseOver) e.state = 'rest';
            this.render(input); 
          },
          onHover: (isHover) => {
            e.isMouseOver = isHover;
            if (e.state === 'rest' && isHover) { e.state = 'expanded'; this.render(input); }
            else if (e.state === 'expanded' && !isHover && !e.popover) { e.state = 'rest'; this.render(input); }
          }
        });
        
        e.lastState = e.state;
        e.lastTone = e.tone;
      }
      
      if (e.popover) e.pill.classList.add('t-pill--popover-open');
      else e.pill.classList.remove('t-pill--popover-open');

      if (e.popover) {
        if (e.popNode) e.popNode.remove();
        e.popNode = UI.createPopover(e.tone, 
          (toneId) => { e.tone = toneId; e.popover = false; this.render(input); },
          () => { e.popover = false; if (!e.isMouseOver) e.state = 'rest'; this.render(input); }
        );
        e.wrap.appendChild(e.popNode);
        requestAnimationFrame(() => e.popNode.classList.add('popover--active'));
      } else if (e.popNode) {
        e.popNode.classList.remove('popover--active');
        const node = e.popNode;
        setTimeout(() => { if (!e.popover) node.remove(); }, 300);
        e.popNode = null;
      }
    }

    async convert(input) {
      const e = this.registry.get(input);
      e.isRichText = input.isContentEditable;
      let text = (e.isRichText ? input.innerHTML : input.value || input.innerText || "").trim();
      if (!text || text.length < 2) {
        UI.showToast(e.shadow, 'Text too short');
        return;
      }

      e.originalText = text;
      e.state = 'loading'; 
      this.render(input);

      // 1. EXTENSION MODE: Use background script
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            type: "TONESHIFT_CONVERT",
            text: text,
            toneLevel: e.tone
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('Tonal: Background disconnected, falling back to direct AI...');
              this.directConvert(input, text, e);
              return;
            }

            if (response && response.success && response.text) {
              this.insertText(input, response.text, e.isRichText);
              e.state = 'done'; 
              UI.showToast(e.shadow, 'Done!');
            } else {
              e.state = 'error';
              UI.showToast(e.shadow, response?.error || 'AI Offline');
            }
            this.render(input);
          });
          return;
        } catch (err) {
          console.warn('Tonal: Message failed, falling back to direct AI...');
        }
      }

      // 2. SANDBOX/DIRECT MODE: Call worker directly
      this.directConvert(input, text, e);
    }

    async directConvert(input, text, e) {
      try {
        const response = await fetch(WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            toneLevel: e.tone,
            mode: "convert"
          })
        });

        const data = await response.json();
        if (data.success && data.text) {
          this.insertText(input, data.text, e.isRichText);
          e.state = 'done';
          UI.showToast(e.shadow, 'Done (Direct AI)');
        } else {
          throw new Error(data.error || "AI Offline");
        }
      } catch (err) {
        console.error('Tonal Direct AI Failed:', err);
        // Final fallback: simulated response so UI doesn't hang
        setTimeout(() => {
          this.insertText(input, `[SANDBOX: ${e.tone.toUpperCase()}] ${text}`, e.isRichText);
          e.state = 'done';
          this.render(input);
        }, 800);
      }
      this.render(input);
    }

    insertText(input, text, isRichText = false) {
      input.focus();
      document.execCommand('selectAll', false, null);

      // 1. Synthetic Paste Event
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      if (isRichText) dataTransfer.setData('text/html', text);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(pasteEvent);

      // If framework handled the paste, stop to prevent duplication.
      if (pasteEvent.defaultPrevented) {
        input.blur(); input.focus();
        return;
      }

      // 2. Synthetic beforeinput Event
      const beforeInputEvent = new InputEvent('beforeinput', {
        inputType: isRichText ? 'insertFromPaste' : 'insertText',
        data: text,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(beforeInputEvent);

      // If framework handled beforeinput, stop.
      if (beforeInputEvent.defaultPrevented) {
        input.blur(); input.focus();
        return;
      }

      // 3. Native DOM Mutation (Fallback for basic inputs like Sandbox)
      const command = isRichText ? 'insertHTML' : 'insertText';
      document.execCommand(command, false, text);
        
      // Notify basic listeners
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Force framework re-render flush
      input.blur();
      input.focus();
    }

    undo(input) {
      const e = this.registry.get(input);
      if (!e.originalText) return;
      this.insertText(input, e.originalText, e.isRichText);
      e.state = 'rest';
      this.render(input);
      UI.showToast(e.shadow, 'Restored original text');
    }

    updatePositions() {
      for (const [input, e] of this.registry.entries()) {
        if (!input.isConnected) { 
          e.wrap.remove(); 
          this.resizeObserver.unobserve(input);
          this.registry.delete(input); 
          continue; 
        }
        const rect = input.getBoundingClientRect();
        // Skip hidden elements to prevent jumping
        if (rect.width === 0 && rect.height === 0) continue;
        
        const safeRect = this.getSafeRect(rect);
        const isWA = window.location.host.includes('whatsapp');
        const isSL = window.location.host.includes('slack');
        
        if (isWA || isSL) {
          e.wrap.style.top = `${safeRect.top + (safeRect.height - 32) / 2}px`;
          e.wrap.style.left = `${safeRect.left + safeRect.width - 210}px`;
        } else {
          e.wrap.style.top = `${safeRect.top + safeRect.height + 4}px`;
          e.wrap.style.left = `${safeRect.left + safeRect.width - 200}px`;
        }
      }
    }
  }

  if (window.Tonal) new TonalInjector();
})();
