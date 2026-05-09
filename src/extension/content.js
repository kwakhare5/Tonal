/**
 * TONAL CONTENT INJECTOR v4.0.0
 * Ultra-Lean | Inside-the-Box Docking | State-Driven
 */

(function() {
  const UI = window.Tonal;
  const SHADOW_ID = 'tonal-v4-root';
  const SELECTORS = ['[contenteditable="true"]', 'textarea', '[role="textbox"]', '.ql-editor'].join(',');

  class TonalInjector {
    constructor() {
      this.registry = new Map(); // input -> { wrap, state, tone, popover, originalText }
      this.init();
    }

    init() {
      const scan = () => {
        const elements = document.querySelectorAll(SELECTORS);
        elements.forEach(el => {
          if (el.dataset.tonal || (el.offsetWidth === 0 && el.offsetHeight === 0)) return;
          el.dataset.tonal = "v4";
          this.register(el);
          console.log('🔍 Tonal: Injected into', el.tagName, el.className);
        });
      };

      scan(); 
      setInterval(scan, 1000);
      document.addEventListener('DOMContentLoaded', scan);
      window.addEventListener('load', scan);

      requestAnimationFrame(() => this.watch());
    }

    getShadow() {
      let host = document.getElementById(SHADOW_ID);
      if (!host) {
        host = UI.h('div', { id: SHADOW_ID, style: 'position:absolute; top:0; left:0; width:0; height:0; z-index:2147483647;' });
        document.body.appendChild(host);
      }
      if (!host.shadowRoot) {
        const shadow = host.attachShadow({ mode: 'open' });
        UI.injectStyles(shadow);
        return shadow;
      }
      return host.shadowRoot;
    }

    register(input) {
      const shadow = this.getShadow();
      const wrap = UI.h('div', { 
        style: 'position:absolute; pointer-events:auto; display:flex; align-items:center; justify-content:flex-end; width:200px; height:32px;' 
      });
      shadow.appendChild(wrap);

      const entry = { 
        wrap, 
        shadow, 
        state: 'rest', 
        tone: 'workChat', 
        popover: false,
        originalText: '' 
      };
      this.registry.set(input, entry);
      this.render(input);
    }

    render(input) {
      const e = this.registry.get(input);
      if (!e) return;
      e.wrap.innerHTML = '';

      const pill = UI.createPill(e.state, e.tone, {
        onClick: () => {
          if (e.state === 'rest') { e.state = 'expanded'; this.render(input); }
          else if (e.state === 'expanded') this.convert(input);
          else if (e.state === 'done') this.undo(input);
        },
        onTogglePopover: () => { e.popover = !e.popover; this.render(input); }
      });

      if (e.popover) {
        const pop = UI.createPopover(e.tone, (newTone) => {
          e.tone = newTone; e.popover = false; this.render(input);
        });
        e.wrap.appendChild(pop);
        requestAnimationFrame(() => pop.classList.add('popover--active'));
      }
      
      e.wrap.appendChild(pill);
    }

    async convert(input) {
      const e = this.registry.get(input);
      const text = input.innerText || input.value;
      if (!text || text.length < 3) return;

      e.originalText = text;
      e.state = 'loading'; 
      this.render(input);

      // Simulate API Logic
      setTimeout(() => {
        const result = `[TONAL: ${e.tone.toUpperCase()}] ${text}`;
        this.insertText(input, result);
        
        e.state = 'done'; 
        this.render(input);
        UI.showToast(e.shadow, 'Tone shifted to ' + e.tone);
      }, 1000);
    }

    insertText(input, text) {
      input.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      
      ['input', 'change', 'blur'].forEach(name => {
        input.dispatchEvent(new Event(name, { bubbles: true }));
      });
    }

    undo(input) {
      const e = this.registry.get(input);
      if (!e.originalText) return;
      
      this.insertText(input, e.originalText);
      e.state = 'rest';
      this.render(input);
      UI.showToast(e.shadow, 'Restored original text');
    }

    watch() {
      this.registry.forEach((e, input) => {
        if (!document.contains(input)) { e.wrap.remove(); this.registry.delete(input); return; }
        const r = input.getBoundingClientRect();
        if (r.width < 10) { e.wrap.style.display = 'none'; return; }
        
        const isSmall = r.height < 45;
        const x = window.scrollX + r.right - 200 - 10;
        const y = window.scrollY + r.top + (isSmall ? (r.height / 2 - 16) : 6);

        e.wrap.style.display = 'flex';
        e.wrap.style.left = `${x}px`;
        e.wrap.style.top = `${y}px`;
      });
      requestAnimationFrame(() => this.watch());
    }
  }

  if (window.Tonal) new TonalInjector();
})();
