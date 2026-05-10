/**
 * TONAL CONTENT ORCHESTRATOR
 * Zero Bloat | Production-Hardened
 */

(function () {
  // CONTEXT GUARD: If the extension was updated/reloaded, the context is invalidated.
  // We must stop execution to prevent "Extension context invalidated" errors.
  if (!chrome.runtime?.id) return;

  const UI = window.Tonal;
  const ADAPTERS = window.TonalAdapters;
  const SHADOW_ID = 'tonal-root';
  const CONFIG = {
    DEBOUNCE_SCAN: 150,
    DEBOUNCE_HOVER: 250,
    MAGNET_THRESHOLD_DECODE: 60,
    MAGNET_THRESHOLD_PILL: 50,
    MAGNET_PULL_DECODE: 0.35,
    MAGNET_PULL_PILL: 0.25,
    ANIM_DURATION_MS: 300
  };

  /**
   * Returns a storage key based on the current platform.
   */
  function getPlatformKey() {
    const url = window.location.href;
    if (url.includes('slack.com')) return 'tonal_tone_slack';
    if (url.includes('linkedin.com')) return 'tonal_tone_linkedin';
    if (url.includes('whatsapp.com')) return 'tonal_tone_whatsapp';
    if (url.includes('mail.google.com')) return 'tonal_tone_gmail';
    return 'tonal_tone_default';
  }

  class TonalInjector {
    constructor() {
      /** @type {Map<HTMLElement, Object>} Registry of active text inputs */
      this.registry = new Map();

      /** @type {Object} State management for decoding selected text */
      this.decodeUI = { button: null, card: null, selectedText: '', selectedRect: null };

      this._updatePending = false;
      this._shadow = null;

      this.init();
      this.initGlobalListeners();
    }

    /**
     * Initializes global event listeners for popover dismissal and selection tracking.
     */
    initGlobalListeners() {
      // Dismiss popovers when clicking outside. 
      // Logic: Use the full event 'e' to access composedPath() for Shadow DOM isolation.
      document.addEventListener('click', (e) => this.dismissPopovers(e));

      // Track text selection for the "Decode" feature
      document.addEventListener('selectionchange', () => this.handleSelection());

      // Magnetic Pull Engine
      document.addEventListener('mousemove', (e) => this.handleMagneticPull(e));

      // Re-scan on click (Fallback for SPAs)
      document.addEventListener('click', () => this.initScan(), { passive: true });

      // Ensure layout stays synced on window changes
      const onSync = () => this.requestPositionUpdate();
      window.addEventListener('resize', onSync, { passive: true });
      document.addEventListener('scroll', onSync, { passive: true, capture: true });

      // Live Sync: Update UI across tabs when settings change
      chrome.storage.onChanged.addListener((changes) => {
        const key = getPlatformKey();
        if (changes[key]) {
          this.registry.forEach(entry => {
            entry.tone = changes[key].newValue;
            this.render(entry.input);
          });
        }
      });
    }

    /**
     * High-fidelity magnetic pull for active UI elements.
     */
    handleMagneticPull(e) {
      const targets = [];
      
      // 1. Target the Decode button
      if (this.decodeUI.button && this.decodeUI.button.style.display !== 'none') {
        targets.push({ el: this.decodeUI.button, threshold: CONFIG.MAGNET_THRESHOLD_DECODE, pullFactor: CONFIG.MAGNET_PULL_DECODE });
      }

      // 2. Target all active pills in the registry
      this.registry.forEach(entry => {
        const pill = entry.wrap.querySelector('.t-pill');
        if (pill) {
          targets.push({ el: pill, threshold: CONFIG.MAGNET_THRESHOLD_PILL, pullFactor: CONFIG.MAGNET_PULL_PILL });
        }
      });

      targets.forEach(t => {
        const rect = t.el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < t.threshold) {
          const pull = (t.threshold - dist) / t.threshold;
          const x = dx * pull * t.pullFactor;
          const y = dy * pull * t.pullFactor;
          t.el.style.transform = `translate(${x}px, ${y}px) scale(${t.el.classList.contains('t-pill--rest') ? 1.08 : 1})`;
        } else {
          t.el.style.transform = '';
        }
      });
    }

    /**
     * Handles text selection on the page.
     */
    handleSelection() {
      if (this.decodeUI.isDecoding) return; // LOCK: Don't move/hide while decoding

      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0 && !this.decodeUI.card) {
        const range = selection.getRangeAt(0);
        this.decodeUI.selectedText = text;
        this.decodeUI.selectedRect = range.getBoundingClientRect();
        this.showDecodeButton();
      } else {
        this.hideDecodeButton();
      }
    }

    /**
     * Shows the floating "Decode" button near selected text.
     */
    showDecodeButton() {
      if (this._decodeTimeout) clearTimeout(this._decodeTimeout);
      this._decodeTimeout = setTimeout(() => {
        const rect = this.decodeUI.selectedRect;
        if (!rect || !this.decodeUI.selectedText) return;

        if (!this.decodeUI.button) {
          this.decodeUI.button = UI.createDecodeFloat(() => this.decodeText());
          this.getShadow().appendChild(this.decodeUI.button);
        }

        const btn = this.decodeUI.button;
        const span = btn.querySelector('span');
        if (span) span.textContent = 'Decode';
        btn.classList.remove('decode-float--loading');

        const safeRect = this.getSafeRect(rect);
        const btnWidth = 72;
        const btnHeight = 28;

        // Horizontal: Exact Center
        const left = safeRect.left + (safeRect.width / 2) - (btnWidth / 2);

        // Vertical: Prioritize ABOVE (safer for messaging apps)
        let top = safeRect.top - btnHeight - 4;

        // Flip to BELOW if there is no space at the top of the viewport
        if (rect.top < btnHeight + 20) {
          top = safeRect.top + safeRect.height + 4;
        }

        Object.assign(btn.style, {
          left: `${Math.max(12, Math.min(left, window.innerWidth - btnWidth - 12))}px`,
          top: `${top}px`,
          display: 'inline-flex'
        });

        requestAnimationFrame(() => btn.classList.add('decode-float--active'));
      }, 150);
    }

    /**
     * Hides the decode button with a fade-out.
     */
    hideDecodeButton() {
      if (this.decodeUI.button) {
        this.decodeUI.button.classList.remove('decode-float--active');
        setTimeout(() => { if (this.decodeUI.button) this.decodeUI.button.style.display = 'none'; }, 300);
      }
    }

    /**
     * Sends selected text to the AI for decoding.
     */
    async decodeText() {
      const text = this.decodeUI.selectedText;
      if (!text || this.decodeUI.isDecoding) return;

      this.decodeUI.isDecoding = true;
      this.hideDecodeButton(); // Hide IMMEDIATELY on click

      try {
        const result = await this.callAI(text, 'decode');
        this.decodeUI.isDecoding = false;
        this.showDecodeCard(result, this.decodeUI.selectedRect);
      } catch (err) {
        this.decodeUI.isDecoding = false;
        UI.showToast(this.getShadow(), 'Decode failed', 'error');
      }
    }

    /**
     * Communicates with background.js to call the AI Proxy.
     */
    async callAI(text, mode, toneLevel = 'workChat', attempt = 1) {
      const MAX_RETRIES = 3;
      
      return new Promise((resolve, reject) => {
        if (!chrome.runtime?.id) return reject('Extension reloaded. Please refresh the page.');
        
        chrome.runtime.sendMessage({
          type: mode === 'decode' ? "TONESHIFT_DECODE" : "TONESHIFT_CONVERT",
          text, toneLevel
        }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            // ELITE RETRY LOGIC: Silent recovery for transient blips
            if (attempt < MAX_RETRIES) {
              const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
              setTimeout(() => {
                this.callAI(text, mode, toneLevel, attempt + 1).then(resolve).catch(reject);
              }, delay);
            } else {
              reject(res?.error || 'AI Offline');
            }
          } else {
            resolve(res.text);
          }
        });
      });
    }

    /**
     * Shows the final decoded message card.
     */
    showDecodeCard(resultText, rect) {
      if (this.decodeUI.card) this.decodeUI.card.remove();

      // 1. Setup dimensions and viewport constants
      const cardWidth = 288;
      const safeHeight = 420; // Matches CSS max-height for collision check
      const vH = window.innerHeight;
      const vW = window.innerWidth;
      const sY = window.scrollY;

      const safeRect = this.getSafeRect(rect);
      let left = safeRect.left + (safeRect.width / 2) - (cardWidth / 2);
      let top = safeRect.top + safeRect.height + 12;

      // 2. Instant Proactive Collision Logic
      const bottomLimit = sY + vH - 24;
      const topLimit = sY + 12;

      // If appearing below would cut the card off...
      if (top + safeHeight > bottomLimit) {
        // Try appearing ABOVE the selection
        const aboveTop = safeRect.top - safeHeight - 12;
        if (aboveTop > topLimit) {
          top = aboveTop;
        } else {
          // If it fits nowhere relative to selection, anchor to fixed screen center
          this.decodeUI.card = UI.createDecodeCard(resultText, () => this.dismissDecodeCard());
          this.decodeUI.card.style.position = 'fixed';
          Object.assign(this.decodeUI.card.style, {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'block'
          });
          this.getShadow().appendChild(this.decodeUI.card);
          requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
          return;
        }
      }

      // 3. Horizontal Safety Guard
      left = Math.max(12, Math.min(left, vW - cardWidth - 12));

      // 4. Create and Render instantly at final coordinates
      this.decodeUI.card = UI.createDecodeCard(resultText, () => this.dismissDecodeCard());
      Object.assign(this.decodeUI.card.style, {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        display: 'block'
      });

      this.getShadow().appendChild(this.decodeUI.card);
      requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
    }

    dismissDecodeCard() {
      if (!this.decodeUI.card) return;
      this.decodeUI.card.classList.remove('decode-card--active');
      const node = this.decodeUI.card;
      setTimeout(() => { if (node) node.remove(); if (this.decodeUI.card === node) this.decodeUI.card = null; }, 200);
    }

    /**
     * Dismisses any open UI elements if clicking outside.
     * Logic: composedPath() is required because e.target is retargeted to the shadow host.
     */
    dismissPopovers(e) {
      const path = e.composedPath();
      const target = path[0];

      // 1. Dismiss Decode Result Card
      if (this.decodeUI.card && !path.includes(this.decodeUI.card)) {
        this.decodeUI.card.classList.remove('decode-card--active');
        const node = this.decodeUI.card;
        setTimeout(() => { if (node) node.remove(); if (this.decodeUI.card === node) this.decodeUI.card = null; }, 200);
      }

      // 2. Dismiss Tone Selector Popovers
      this.registry.forEach(entry => {
        if (entry.popover && !path.includes(entry.wrap)) {
          entry.popover = false;
          entry.state = 'rest';
          this.render(entry.input);
        }
      });
    }

    /**
     * Sets up the MutationObserver to scan for new inputs as the user scrolls.
     */
    init() {
      this.observer = new MutationObserver((m) => {
        if (m.some(x => x.addedNodes.length)) {
          this.initScan();
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });

      this.initScan(); // Initial scan
      UI.injectFonts();
    }

    /**
     * Scans the page for valid text inputs, including those inside Shadow DOMs.
     */
    initScan() {
      if (this._scanTimeout) clearTimeout(this._scanTimeout);
      this._scanTimeout = setTimeout(() => {
        const adapter = ADAPTERS.manager.getAdapter();
        if (!adapter || adapter.id === 'none') return;

        // Recursive scanner for Shadow DOM support with performance filtering
        const scanNode = (root) => {
          // 1. Direct hit on current root
          root.querySelectorAll(adapter.selectors.join(',')).forEach(el => {
            if (el.dataset.tonal || !adapter.isValid(el)) return;
            el.dataset.tonal = "v5";
            this.register(el, adapter);
          });

          // 2. Selective Shadow Root diving (ignore scripts, styles, and SVGs)
          root.querySelectorAll('div, section, main, footer, header, aside, [role]').forEach(el => {
            if (el.shadowRoot) scanNode(el.shadowRoot);
          });
        };

        scanNode(document);
      }, CONFIG.DEBOUNCE_SCAN);
    }

    /**
     * Lazily creates the Shadow Root for isolated UI.
     */
    getShadow() {
      if (this._shadow) return this._shadow;

      let host = document.getElementById(SHADOW_ID);
      if (!host) {
        host = document.createElement('div');
        host.id = SHADOW_ID;
        host.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647; pointer-events:none;';
        (document.body || document.documentElement).appendChild(host);
      }

      this._shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
      if (!host.shadowRoot.querySelector('style')) UI.injectStyles(this._shadow);

      return this._shadow;
    }

    /**
     * Maps global screen coordinates to Shadow Root space.
     */
    getSafeRect(rect) {
      const host = document.getElementById(SHADOW_ID);
      if (!host) return rect;
      const hRect = host.getBoundingClientRect();
      return { left: rect.left - hRect.left, top: rect.top - hRect.top, width: rect.width, height: rect.height };
    }

    /**
     * Registers a new input field into the Tonal engine.
     */
    register(input, adapter) {
      const wrap = UI.h('div', { className: 't-wrap', style: 'position:absolute; pointer-events:auto; width:0; height:0;' });
      this.getShadow().appendChild(wrap);

      const entry = { input, wrap, adapter, state: 'rest', tone: 'workChat', popover: false, pill: null, isMouseOver: false };
      this.registry.set(input, entry);

      this.resizeObserver = this.resizeObserver || new ResizeObserver(() => this.requestPositionUpdate());
      this.resizeObserver.observe(input);

      // Initial state load
      const key = getPlatformKey();
      chrome.storage.sync.get(key, (res) => {
        if (res[key]) entry.tone = res[key];
        this.render(input);
        this.requestPositionUpdate();
      });

      // Handle text changes: close popover and reset 'Done' state
      input.addEventListener('input', () => {
        if (entry.state === 'done') entry.state = 'rest';
        if (entry.popover) {
          entry.popover = false;
          entry.state = 'rest';
        }
        this.render(input);
      }, { passive: true });
    }

    /**
     * Renders the UI state for a specific input field.
     */
    render(input) {
      // Logic: Central render loop ensures UI state is always a pure function of entry state.
      const entry = this.registry.get(input);
      if (!entry) return;

      if (!entry.pill) {
        entry.pill = UI.h('div', { className: 't-pill', style: 'position:absolute; right:0; bottom:0;' });
        entry.wrap.appendChild(entry.pill);
      }

      UI.renderPill(entry.pill, entry.state, entry.tone, entry.popover, {
        onClick: () => {
          if (entry.state === 'rest') { entry.state = 'expanded'; this.render(input); }
          else if (entry.state === 'expanded') this.convert(input);
          else if (entry.state === 'done') this.undo(input);
        },
        onTogglePopover: () => {
          entry.popover = !entry.popover;
          if (!entry.popover) entry.state = entry.isMouseOver ? 'expanded' : 'rest';
          this.render(input);
        },
        onHover: (hover) => {
          entry.isMouseOver = hover;
          if (hover) {
            if (entry.hoverTimer) clearTimeout(entry.hoverTimer);
            if (!entry.popover) {
              entry.state = 'expanded';
              this.render(input);
            }
          } else {
            // Grace period: collapse if we leave the pill AND are not in popover
            entry.hoverTimer = setTimeout(() => {
              if (!entry.isMouseOver && !entry.isMouseOverPopover && !entry.popover) {
                entry.state = 'rest';
                this.render(input);
              }
            }, CONFIG.DEBOUNCE_HOVER);
          }
        }
      });

      this.updatePopoverState(entry);
    }

    /**
     * Manages the popover lifecycle (creation/removal/positioning).
     */
    updatePopoverState(entry) {
      // Logic: Sticky popover state. Only create if missing to prevent click interruption.
      if (entry.popover) {
        if (!entry.popNode) {
          entry.popNode = UI.createPopover(
            entry.tone,
            (t) => {
              entry.tone = t;
              entry.popover = false;
              entry.state = entry.isMouseOver ? 'expanded' : 'rest';
              chrome.storage.sync.set({ [getPlatformKey()]: t });
              this.render(entry.input);
              
              // SMARTER UX: One-Touch Conversion
              this.convert(entry.input);
            },
            () => { // onClose
              entry.popover = false;
              entry.state = entry.isMouseOver ? 'expanded' : 'rest';
              this.render(entry.input);
            },
            () => { // onMouseEnter
              entry.isMouseOverPopover = true;
              if (entry.hoverTimer) clearTimeout(entry.hoverTimer);
            },
            () => { // onMouseLeave
              entry.isMouseOverPopover = false;
              entry.hoverTimer = setTimeout(() => {
                if (!entry.isMouseOver && !entry.isMouseOverPopover && !entry.popover) {
                  entry.state = 'rest';
                  this.render(entry.input);
                }
              }, 250);
            }
          );
          entry.wrap.appendChild(entry.popNode);
        }

        // Anti-Gravity: Flip up if cramped
        const isCramped = entry.input.getBoundingClientRect().top < 220;
        Object.assign(entry.popNode.style, {
          position: 'absolute', right: '0',
          bottom: isCramped ? 'auto' : '40px',
          top: isCramped ? '24px' : 'auto',
          transformOrigin: isCramped ? 'top right' : 'bottom right'
        });

        requestAnimationFrame(() => {
          if (entry.popNode) entry.popNode.classList.add('popover--active');
        });
      } else if (entry.popNode) {
        entry.popNode.classList.remove('popover--active');
        const node = entry.popNode;
        setTimeout(() => node.remove(), 200);
        entry.popNode = null;
      }
    }

    /**
     * Executes the rephrasing logic.
     */
    async convert(input) {
      const entry = this.registry.get(input);
      const currentText = entry.adapter.getValue(input);
      if (!currentText || currentText.length < 2) return UI.showToast(this.getShadow(), 'Type something first', 'error');

      // Snapshot text before AI call to detect "Dirty State" (typing while loading)
      const textAtStart = currentText;
      
      if (entry.state !== 'done') {
        entry.originalText = currentText;
      }
      const sourceText = entry.originalText || currentText;

      entry.state = 'loading';
      this.render(input);

      try {
        let res = await this.callAI(sourceText, 'convert', entry.tone);
        res = (res || "").trim(); // AI Sanitization
        
        // Final Dirty Check: Did the user type something new while we were waiting?
        const textAtEnd = entry.adapter.getValue(input);
        if (textAtEnd !== textAtStart) {
          UI.showToast(this.getShadow(), 'Draft changed. Re-click to update.', 'error');
          entry.state = 'rest';
          this.render(input);
          return;
        }

        entry.adapter.insertText(input, res, input.isContentEditable);
        entry.state = 'done';
        UI.showToast(this.getShadow(), 'Converted');
      } catch (err) {
        entry.state = 'error';
        const msg = err.message === 'Failed to fetch' ? 'Check your internet' : 'Couldn\'t rewrite this';
        UI.showToast(this.getShadow(), msg, 'error');
      }
      this.render(input);
    }

    /**
     * Restores original text.
     */
    undo(input) {
      const entry = this.registry.get(input);
      if (!entry.originalText) return;
      entry.adapter.insertText(input, entry.originalText, input.isContentEditable);
      entry.state = 'rest';
      this.render(input);
      UI.showToast(this.getShadow(), 'Restored');
    }

    /**
     * High-performance positioning engine.
     */
    requestPositionUpdate() {
      if (this._updatePending) return;
      this._updatePending = true;
      requestAnimationFrame(() => {
        this.updatePositions();
        this._updatePending = false;
      });
    }

    updatePositions() {
      this.registry.forEach((entry, input) => {
        if (!input.isConnected) {
          entry.wrap.remove();
          this.registry.delete(input);
          return;
        }

        const rect = input.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          entry.wrap.style.display = 'none';
          return;
        }

        entry.wrap.style.display = 'block';
        const safe = this.getSafeRect(rect);
        const offsets = entry.adapter.getOffsets ? entry.adapter.getOffsets(input) : { x: 8, y: 8 };
        
        // Grammarly Collision Detection
        const collisionOffset = this.checkCollision(input);
        
        entry.wrap.style.left = `${safe.left + safe.width - offsets.x - collisionOffset}px`;
        entry.wrap.style.top = `${safe.top + safe.height - offsets.y}px`;
      });
    }

    /**
     * Detects external UI elements (like Grammarly) to avoid overlapping.
     */
    checkCollision(input) {
      // Common Grammarly selectors or floating widgets
      const grammarly = document.querySelector('grammarly-extension-element, [data-grammarly-part="button"]');
      if (!grammarly) return 0;
      
      const gRect = grammarly.getBoundingClientRect();
      const iRect = input.getBoundingClientRect();
      
      // If Grammarly button is near the bottom right of our input
      const isNear = (gRect.right > iRect.right - 40) && (gRect.bottom > iRect.bottom - 40);
      return isNear ? 32 : 0; // Shift Tonal left by 32px if Grammarly is there
    }
  }

  if (window.Tonal) {
    window.tonalInjector = new TonalInjector();
    console.info('%c Tonal Elite %c Active on ' + window.location.host, 'background: #000; color: #fff; padding: 2px 5px; border-radius: 3px;', 'color: #888;');
  }
})();
