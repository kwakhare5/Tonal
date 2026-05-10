/**
 * TONAL CONTENT ORCHESTRATOR v5.5.0
 * Zero Bloat | Production-Hardened
 */

(function () {
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

      // Ensure layout stays synced on window changes
      const onSync = () => this.requestPositionUpdate();
      window.addEventListener('resize', onSync, { passive: true });
      document.addEventListener('scroll', onSync, { passive: true, capture: true });
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
    async callAI(text, mode, toneLevel = 'workChat') {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: mode === 'decode' ? "TONESHIFT_DECODE" : "TONESHIFT_CONVERT",
          text, toneLevel
        }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) reject(res?.error || 'AI Offline');
          else resolve(res.text);
        });
      });
    }

    /**
     * Shows the final decoded message card.
     */
    showDecodeCard(resultText, rect) {
      if (this.decodeUI.card) this.decodeUI.card.remove();

      this.decodeUI.card = UI.createDecodeCard(resultText, () => {
        this.decodeUI.card.classList.remove('decode-card--active');
        setTimeout(() => { if (this.decodeUI.card) this.decodeUI.card.remove(); this.decodeUI.card = null; }, 200);
      });

      const safeRect = this.getSafeRect(rect);
      const cardWidth = 288;

      // 1. Initial Positioning (Below Selection)
      let left = safeRect.left + (safeRect.width / 2) - (cardWidth / 2);
      let top = safeRect.top + safeRect.height + 12;

      // 2. Viewport Guarding Logic
      const vH = window.innerHeight;
      const vW = window.innerWidth;
      const sY = window.scrollY;

      // Use a shadow element to measure height if possible, or use a safe estimate
      const cardHeightEstimate = 240;

      // Check Bottom Collision (WhatsApp Input Bar Zone)
      if (rect.top + rect.height + cardHeightEstimate > vH + sY - 20) {
        // FLIP: Try showing above the selection
        top = safeRect.top - cardHeightEstimate - 12;

        // Check Top Collision (Very long message or selection at top)
        if (top < 10) {
          // FAIL-SAFE: If it doesn't fit above OR below, anchor to screen center
          top = (vH / 2) - (cardHeightEstimate / 2);
          left = (vW / 2) - (cardWidth / 2);
          this.decodeUI.card.style.position = 'fixed'; // Lock to viewport
        }
      }

      Object.assign(this.decodeUI.card.style, {
        position: this.decodeUI.card.style.position || 'absolute',
        left: `${Math.max(12, Math.min(left, vW - cardWidth - 12))}px`,
        top: `${top}px`,
        display: 'block'
      });

      this.getShadow().appendChild(this.decodeUI.card);
      requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
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
      const scan = () => {
        const adapter = ADAPTERS.manager.getAdapter();
        if (!adapter) return;

        document.querySelectorAll(adapter.selectors.join(',')).forEach(el => {
          if (el.dataset.tonal || !adapter.isValid(el)) return;
          el.dataset.tonal = "v5";
          this.register(el, adapter);
        });
      };

      let scanTimeout;
      this.observer = new MutationObserver((m) => {
        if (m.some(x => x.addedNodes.length)) {
          if (scanTimeout) clearTimeout(scanTimeout);
          scanTimeout = setTimeout(scan, CONFIG.DEBOUNCE_SCAN);
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });

      scan(); // Initial scan
      UI.injectFonts();
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
      const key = this.getPlatformKey();
      chrome.storage.sync.get(key, (res) => {
        if (res[key]) entry.tone = res[key];
        this.render(input);
        this.requestPositionUpdate();
      });
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
              chrome.storage.sync.set({ [this.getPlatformKey()]: t });
              this.render(entry.input);
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
      const text = entry.adapter.getValue(input);
      if (!text || text.length < 2) return UI.showToast(this.getShadow(), 'Type more first', 'error');

      entry.originalText = text;
      entry.state = 'loading';
      this.render(input);

      try {
        const res = await this.callAI(text, 'convert', entry.tone);
        entry.adapter.insertText(input, res, input.isContentEditable);
        entry.state = 'done';
        UI.showToast(this.getShadow(), 'Done!');
      } catch (err) {
        entry.state = 'error';
        UI.showToast(this.getShadow(), 'AI Busy', 'error');
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
      for (const [input, entry] of this.registry.entries()) {
        if (!input.isConnected) {
          entry.wrap.remove();
          this.registry.delete(input);
          continue;
        }

        const rect = input.getBoundingClientRect();
        if (rect.width === 0) continue;

        const safeRect = this.getSafeRect(rect);
        const off = entry.adapter.getOffsets(input);

        // Auto-center in single-line inputs
        const yOff = rect.height < 60 ? (rect.height - 32) / 2 : off.y;

        entry.wrap.style.top = `${safeRect.top + safeRect.height - yOff}px`;
        entry.wrap.style.left = `${safeRect.left + safeRect.width - off.x}px`;
      }
    }

    /**
     * Returns a storage key based on the current platform.
     */
    getPlatformKey() {
      const url = window.location.href;
      if (url.includes('slack.com')) return 'tonal_tone_slack';
      if (url.includes('linkedin.com')) return 'tonal_tone_linkedin';
      if (url.includes('whatsapp.com')) return 'tonal_tone_whatsapp';
      if (url.includes('mail.google.com')) return 'tonal_tone_gmail';
      return 'tonal_tone_default';
    }
  }

  if (window.Tonal) window.tonalInjector = new TonalInjector();
})();
