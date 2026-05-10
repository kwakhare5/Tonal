/**
 * TONAL CONTENT ORCHESTRATOR
 * Zero Bloat | Production-Hardened
 */

(function () {
  // CONTEXT GUARD: If the extension was updated/reloaded, the context is invalidated.
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

  const TONE_KEY = 'defaultTone';

  class TonalInjector {
    constructor() {
      this.registry = new Map();
      this.decodeUI = { button: null, card: null, selectedText: '', selectedRect: null };
      this._updatePending = false;
      this._shadow = null;

      this.init();
      this.initGlobalListeners();
    }

    initGlobalListeners() {
      document.addEventListener('click', (e) => this.dismissPopovers(e));
      document.addEventListener('selectionchange', () => this.handleSelection());
      document.addEventListener('mousemove', (e) => this.handleMagneticPull(e));
      document.addEventListener('click', () => this.initScan(), { passive: true });

      const onSync = () => this.requestPositionUpdate();
      window.addEventListener('resize', onSync, { passive: true });
      document.addEventListener('scroll', onSync, { passive: true, capture: true });

      chrome.storage.onChanged.addListener((changes) => {
        if (changes[TONE_KEY]) {
          this.registry.forEach(entry => {
            entry.tone = changes[TONE_KEY].newValue;
            this.render(entry.input);
          });
        }
      });
    }


    handleMagneticPull(e) {
      const targets = [];
      if (this.decodeUI.button && this.decodeUI.button.style.display !== 'none') {
        targets.push({ el: this.decodeUI.button, threshold: CONFIG.MAGNET_THRESHOLD_DECODE, pullFactor: CONFIG.MAGNET_PULL_DECODE });
      }
      this.registry.forEach(entry => {
        const pill = entry.wrap.querySelector('.t-pill');
        if (pill) targets.push({ el: pill, threshold: CONFIG.MAGNET_THRESHOLD_PILL, pullFactor: CONFIG.MAGNET_PULL_PILL });
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

    handleSelection() {
      if (this.decodeUI.isDecoding) return;
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
        btn.style.display = 'inline-flex';
        const safeRect = this.getSafeRect(rect);
        const left = safeRect.left + (safeRect.width / 2) - 36;
        let top = safeRect.top - 32;
        if (rect.top < 40) top = safeRect.top + safeRect.height + 4;

        Object.assign(btn.style, {
          left: `${Math.max(12, Math.min(left, window.innerWidth - 84))}px`,
          top: `${top}px`
        });
        requestAnimationFrame(() => btn.classList.add('decode-float--active'));
      }, 150);
    }

    hideDecodeButton() {
      if (this.decodeUI.button) {
        this.decodeUI.button.classList.remove('decode-float--active');
        setTimeout(() => { if (this.decodeUI.button) this.decodeUI.button.style.display = 'none'; }, 300);
      }
    }

    async decodeText() {
      const text = this.decodeUI.selectedText;
      if (!text || this.decodeUI.isDecoding) return;
      this.decodeUI.isDecoding = true;
      this.hideDecodeButton();
      try {
        const result = await this.callAI(text, 'decode');
        this.decodeUI.isDecoding = false;
        this.showDecodeCard(result, this.decodeUI.selectedRect);
      } catch (err) {
        this.decodeUI.isDecoding = false;
        UI.showToast(this.getShadow(), 'Decode failed', 'error');
      }
    }

    async callAI(text, mode, toneLevel = 'workChat', attempt = 1) {
      const MAX_RETRIES = 3;
      return new Promise((resolve, reject) => {
        if (!chrome.runtime?.id) return reject('Extension reloaded. Please refresh.');
        chrome.runtime.sendMessage({
          type: mode === 'decode' ? "TONESHIFT_DECODE" : "TONESHIFT_CONVERT",
          text, toneLevel
        }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            if (attempt < MAX_RETRIES) {
              setTimeout(() => this.callAI(text, mode, toneLevel, attempt + 1).then(resolve).catch(reject), Math.pow(2, attempt) * 500);
            } else reject(res?.error || 'AI Offline');
          } else resolve(res.text);
        });
      });
    }

    showDecodeCard(resultText, rect) {
      if (this.decodeUI.card) this.decodeUI.card.remove();
      const cardWidth = 288;
      const safeHeight = 420;
      const vH = window.innerHeight;
      const vW = window.innerWidth;
      const sY = window.scrollY;

      const safeRect = this.getSafeRect(rect);
      let left = safeRect.left + (safeRect.width / 2) - (cardWidth / 2);
      let top = safeRect.top + safeRect.height + 12;

      if (top + safeHeight > sY + vH - 24) {
        const aboveTop = safeRect.top - safeHeight - 12;
        if (aboveTop > sY + 12) top = aboveTop;
        else {
          this.decodeUI.card = UI.createDecodeCard(resultText, () => this.dismissDecodeCard());
          Object.assign(this.decodeUI.card.style, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'block' });
          this.getShadow().appendChild(this.decodeUI.card);
          requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
          return;
        }
      }

      left = Math.max(12, Math.min(left, vW - cardWidth - 12));
      this.decodeUI.card = UI.createDecodeCard(resultText, () => this.dismissDecodeCard());
      Object.assign(this.decodeUI.card.style, { position: 'absolute', left: `${left}px`, top: `${top}px`, display: 'block' });
      this.getShadow().appendChild(this.decodeUI.card);
      requestAnimationFrame(() => this.decodeUI.card.classList.add('decode-card--active'));
    }

    dismissDecodeCard() {
      if (!this.decodeUI.card) return;
      this.decodeUI.card.classList.remove('decode-card--active');
      const node = this.decodeUI.card;
      setTimeout(() => { if (node) node.remove(); if (this.decodeUI.card === node) this.decodeUI.card = null; }, 200);
    }

    dismissPopovers(e) {
      const path = e.composedPath();
      if (this.decodeUI.card && !path.includes(this.decodeUI.card)) this.dismissDecodeCard();
      this.registry.forEach(entry => {
        if (entry.popover && !path.includes(entry.wrap)) {
          entry.popover = false;
          entry.state = 'rest';
          this.render(entry.input);
        }
      });
    }

    init() {
      this.observer = new MutationObserver(() => this.initScan());
      this.observer.observe(document.body, { childList: true, subtree: true });
      this.initScan();
      UI.injectFonts();
    }

    initScan() {
      if (this._scanTimeout) clearTimeout(this._scanTimeout);
      this._scanTimeout = setTimeout(() => {
        const adapter = ADAPTERS.manager.getAdapter();
        if (!adapter || adapter.id === 'none') return;

        const scanNode = (root) => {
          root.querySelectorAll(adapter.selectors.join(',')).forEach(el => {
            if (el.dataset.tonal || !adapter.isValid(el)) return;
            el.dataset.tonal = "v5";
            this.register(el, adapter);
          });
          root.querySelectorAll('div, section, main, footer, header, aside, [role], [data-tonal-host]').forEach(el => {
            if (el.shadowRoot && el.id !== SHADOW_ID) scanNode(el.shadowRoot);
          });
        };
        scanNode(document);
      }, CONFIG.DEBOUNCE_SCAN);
    }

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

    getSafeRect(rect) {
      const host = document.getElementById(SHADOW_ID);
      if (!host) return rect;
      const hRect = host.getBoundingClientRect();
      return { left: rect.left - hRect.left, top: rect.top - hRect.top, width: rect.width, height: rect.height };
    }

    register(input, adapter) {
      const wrap = UI.h('div', { className: 't-wrap', style: 'position:absolute; pointer-events:auto; width:0; height:0;' });
      this.getShadow().appendChild(wrap);
      const entry = { input, wrap, adapter, state: 'rest', tone: 'workChat', popover: false, pill: null, isMouseOver: false };
      this.registry.set(input, entry);
      this.resizeObserver = this.resizeObserver || new ResizeObserver(() => this.requestPositionUpdate());
      this.resizeObserver.observe(input);

      chrome.storage.sync.get(TONE_KEY, (res) => {
        if (res[TONE_KEY]) entry.tone = res[TONE_KEY];
        this.render(input);
        this.requestPositionUpdate();
      });

      input.addEventListener('input', () => {
        if (entry.state === 'done') entry.state = 'rest';
        if (entry.popover) { entry.popover = false; entry.state = 'rest'; }
        this.render(input);
      }, { passive: true });
    }

    render(input) {
      const entry = this.registry.get(input);
      if (!entry) return;
      if (!entry.pill) {
        entry.pill = UI.h('div', { className: 't-pill', style: 'position:absolute; right:0; bottom:0; transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);' });
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
            if (!entry.popover) { entry.state = 'expanded'; this.render(input); }
          } else {
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

    updatePopoverState(entry) {
      if (entry.popover) {
        if (!entry.popNode) {
          entry.popNode = UI.createPopover(entry.tone, (t) => {
            entry.tone = t; entry.popover = false;
            entry.state = entry.isMouseOver ? 'expanded' : 'rest';
            chrome.storage.sync.set({ [getPlatformKey()]: t });
            this.render(entry.input);
            this.convert(entry.input);
          }, () => {
            entry.popover = false; entry.state = entry.isMouseOver ? 'expanded' : 'rest';
            this.render(entry.input);
          }, () => {
            entry.isMouseOverPopover = true;
            if (entry.hoverTimer) clearTimeout(entry.hoverTimer);
          }, () => {
            entry.isMouseOverPopover = false;
            entry.hoverTimer = setTimeout(() => {
              if (!entry.isMouseOver && !entry.isMouseOverPopover && !entry.popover) {
                entry.state = 'rest'; this.render(entry.input);
              }
            }, 250);
          });
          entry.wrap.appendChild(entry.popNode);
        }
        const isCramped = entry.input.getBoundingClientRect().top < 220;
        Object.assign(entry.popNode.style, {
          position: 'absolute', right: '0', bottom: isCramped ? 'auto' : '40px',
          top: isCramped ? '24px' : 'auto', transformOrigin: isCramped ? 'top right' : 'bottom right'
        });
        requestAnimationFrame(() => { if (entry.popNode) entry.popNode.classList.add('popover--active'); });
      } else if (entry.popNode) {
        entry.popNode.classList.remove('popover--active');
        const node = entry.popNode;
        setTimeout(() => node.remove(), 200);
        entry.popNode = null;
      }
    }

    async convert(input) {
      const entry = this.registry.get(input);
      const currentText = entry.adapter.getValue(input);
      if (!currentText || currentText.length < 2) return UI.showToast(this.getShadow(), 'Type something first', 'error');
      const textAtStart = currentText;
      if (entry.state !== 'done') entry.originalText = currentText;
      const sourceText = entry.originalText || currentText;
      entry.state = 'loading';
      this.render(input);

      try {
        let res = await this.callAI(sourceText, 'convert', entry.tone);
        if (entry.adapter.getValue(input) !== textAtStart) {
          UI.showToast(this.getShadow(), 'Draft changed. Re-click to update.', 'error');
          entry.state = 'rest'; this.render(input); return;
        }
        entry.adapter.insertText(input, (res || "").trim(), input.isContentEditable);
        entry.state = 'done';
        UI.showToast(this.getShadow(), 'Converted');
      } catch (err) {
        entry.state = 'error';
        UI.showToast(this.getShadow(), err.message === 'Failed to fetch' ? 'Check your internet' : 'AI Offline', 'error');
      }
      this.render(input);
    }

    undo(input) {
      const entry = this.registry.get(input);
      if (!entry.originalText) return;
      entry.adapter.insertText(input, entry.originalText, input.isContentEditable);
      entry.state = 'rest'; this.render(input);
      UI.showToast(this.getShadow(), 'Restored');
    }

    requestPositionUpdate() {
      if (this._updatePending) return;
      this._updatePending = true;
      requestAnimationFrame(() => { this.updatePositions(); this._updatePending = false; });
    }

    updatePositions() {
      this.registry.forEach((entry, input) => {
        if (!input.isConnected) { entry.wrap.remove(); this.registry.delete(input); return; }
        const rect = input.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) { entry.wrap.style.display = 'none'; return; }
        entry.wrap.style.display = 'block';
        const safe = this.getSafeRect(rect);
        const offsets = entry.adapter.getOffsets ? entry.adapter.getOffsets(input) : { x: 8, y: 8 };
        const collisionOffset = this.checkCollision(input);
        entry.wrap.style.left = `${safe.left + safe.width - offsets.x - collisionOffset}px`;
        entry.wrap.style.top = `${safe.top + safe.height - offsets.y}px`;
      });
    }

    checkCollision(input) {
      // ELITE COLLISION ENGINE: Aggressive detection of Grammarly and other floating widgets
      
      const grammarlyHosts = document.querySelectorAll('grammarly-extension-element, grammarly-desktop-integration, [data-grammarly-part="button"], .grammarly-control, .gr_');
      const iRect = input.getBoundingClientRect();
      let collisionOffset = 0;

      for (let el of grammarlyHosts) {
        let gRect = el.getBoundingClientRect();

        // If the host is 0x0, probe its Shadow Root for the actual floating button
        if ((gRect.width === 0 || gRect.height === 0) && el.shadowRoot) {
          // Find any visible element inside the shadow root
          const innerElements = el.shadowRoot.querySelectorAll('*');
          for (const inner of innerElements) {
            const innerRect = inner.getBoundingClientRect();
            if (innerRect.width > 10 && innerRect.height > 10 && innerRect.width < 100) {
              gRect = innerRect;
              break;
            }
          }
        }

        // Broad overlap check: Is the widget in the bottom right corner of the input?
        const isOverlapping = (
          gRect.right > iRect.right - 80 && 
          gRect.left < iRect.right + 20 &&
          gRect.bottom > iRect.bottom - 80 &&
          gRect.top < iRect.bottom + 20
        );

        if (isOverlapping) {
          collisionOffset = 48; // Clear the teal icon completely
          break;
        }
      }

      if (collisionOffset > 0) return collisionOffset;

      // Aggressive fallback: Check siblings for unidentified floating widgets
      const parent = input.parentElement;
      if (parent) {
        const widgets = Array.from(parent.children).filter(s => s !== input && s.tagName !== 'STYLE' && s.tagName !== 'SCRIPT');
        for (const w of widgets) {
           const wRect = w.getBoundingClientRect();
           // If sibling is a small floating square/circle near the bottom right
           if (wRect.width > 0 && wRect.width < 60 && wRect.height > 0 && wRect.height < 60) {
             if (wRect.right > iRect.right - 40 && wRect.bottom > iRect.bottom - 40) {
               return 36;
             }
           }
        }
      }

      return 0;
    }


  }

  if (window.Tonal) {
    window.tonalInjector = new TonalInjector();
    console.info('%c Tonal Elite %c Active on ' + window.location.host, 'background: #000; color: #fff; padding: 2px 5px; border-radius: 3px;', 'color: #888;');
  }
})();
