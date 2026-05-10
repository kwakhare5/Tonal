/**
 * TONAL MASTER ENGINE v5.5.0
 * Verbatim Decode UI | Smart Persistence | Nuclear Isolation
 */

window.Tonal = (function () {
  const SVGS = {
    LOGO: `<svg width="13" height="8" viewBox="0 0 72 44" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="18" width="72" height="8" rx="4" fill="#2C2C2E"/><rect x="0" y="18" width="39" height="8" rx="4" fill="white"/><circle cx="39" cy="22" r="16" fill="#F2F2F2"/><circle cx="39" cy="22" r="14.5" fill="white"/><circle cx="39" cy="22" r="9" fill="#1C1C1E"/><circle cx="39" cy="22" r="4" fill="#3A3A3C"/></svg>`,
    LOGO_SM: `<svg width="11" height="7" viewBox="0 0 72 44" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="18" width="72" height="8" rx="4" fill="#2C2C2E"/><rect x="0" y="18" width="39" height="8" rx="4" fill="white"/><circle cx="39" cy="22" r="16" fill="#F2F2F2"/><circle cx="39" cy="22" r="14.5" fill="white"/><circle cx="39" cy="22" r="9" fill="#1C1C1E"/><circle cx="39" cy="22" r="4" fill="#3A3A3C"/></svg>`,
    CHEV: `<svg width="7" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l3 3 3-3" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    CLOSE: `<svg width="8" height="8" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    COPY: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    CHECK: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>`
  };

  const CSS = `
    :host {
      all: initial;
      display: block !important;
      position: absolute;
      top: 0; left: 0; width: 0; height: 0;
      z-index: 2147483647;
      pointer-events: none;
      
      /* ── TOKENS ────────────────────────────────────────────────── */
      --black:    #0F0F0F;
      --gray-1:   #1C1C1E;
      --gray-2:   #2C2C2E;
      --gray-3:   #3A3A3C;
      --gray-4:   #636366;
      --gray-5:   #AEAEB2;
      --gray-6:   #D1D1D6;
      --gray-7:   #E5E5EA;
      --gray-8:   #F2F2F7;
      --gray-9:   #F5F5F7;
      --white:    #FFFFFF;
      --green:    #34C759;
      --red:      #FF3B30;
      --orange:   #FF9F0A;

      --font: 'DM Sans', -apple-system, sans-serif;
      --mono: 'DM Mono', 'SF Mono', monospace;

      --r-sm:  6px;
      --r-md:  10px;
      --r-lg:  14px;
      --r-pill:100px;

      --sh-xs: 0 1px 2px rgba(0,0,0,.06);
      --sh-sm: 0 4px 12px rgba(0,0,0,.06);
      --sh-md: 0 12px 32px rgba(0,0,0,.08);
      --sh-lg: 0 24px 64px rgba(0,0,0,.12);

      --ease-out:    cubic-bezier(0.2, 0, 0, 1);
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      --spring: var(--ease-spring);

      -webkit-font-smoothing: antialiased;
      font-family: var(--font);
      color: var(--black);
      font-size: 14px !important;
      line-height: 1.5 !important;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; border: none; font-family: inherit; line-height: inherit; }

    /* ── HITBOX ─────────────────────────────────────────────────── */
    .t-hitbox {
      position: absolute; right: -12px; bottom: -12px;
      padding: 12px; pointer-events: auto; cursor: pointer;
      display: flex; align-items: flex-end; justify-content: flex-end;
      z-index: 100;
    }

    /* ── PILL ───────────────────────────────────────────────────── */
    .t-pill {
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--black); border-radius: var(--r-pill);
      box-shadow: 0 1px 3px rgba(0,0,0,.16);
      transition: transform .1s var(--ease-out), background .1s, box-shadow .1s, width 0.15s var(--spring), height 0.15s var(--spring);
      pointer-events: none; overflow: hidden;
    }
    .t-pill--rest     { width: 30px; height: 16px; }
    .t-hitbox:hover .t-pill--rest { transform: scale(1.08); box-shadow: 0 2px 8px rgba(0,0,0,.2); }
    
    .t-pill--expanded { height: 24px; padding: 0 9px; gap: 5px; }
    .t-pill--loading  { height: 24px; padding: 0 9px; opacity: .55; }
    .t-pill--done     { height: 24px; padding: 0 10px; background: var(--green); box-shadow: 0 1px 4px rgba(52,199,89,.35); }
    .t-pill--error    { height: 24px; padding: 0 9px; background: var(--red); }

    .pill-icon-rest { display: none; }
    .t-pill--rest .pill-icon-rest { display: block; }
    .pill-icon-active { display: none; }
    .t-pill:not(.t-pill--rest) .pill-icon-active { display: block; }
    .pill-text { font-size: 10px; font-weight: 700; color: #FFFFFF !important; white-space: nowrap; display: none; }
    .t-pill:not(.t-pill--rest) .pill-text { display: block; }

    .pill-chev-wrap { 
      display: none; align-items: center; justify-content: center; 
      width: 14px; height: 24px; transition: transform 0.15s var(--spring); 
      cursor: pointer; pointer-events: auto; position: relative;
    }
    .t-pill--expanded .pill-chev-wrap { display: flex; }
    .pill-chev-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; left: -5px; right: -9px; z-index: 1; }
    .t-pill--popover-open .pill-chev-wrap { transform: rotate(180deg); }

    /* ── POPOVER ────────────────────────────────────────────────── */
    .popover {
      position: absolute; bottom: calc(100% + 8px); right: 0;
      width: 192px; background: rgba(255, 255, 255, 0.8) !important;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border-radius: var(--r-lg); border: 1px solid rgba(0,0,0,0.05);
      box-shadow: var(--sh-lg); overflow: hidden;
      opacity: 0; transform: translateY(12px) scale(0.95);
      transition: all 0.2s var(--spring); pointer-events: none;
      display: flex; flex-direction: column; z-index: 1000;
      transform-origin: bottom right;
    }
    .popover--active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .pop-item { display: flex; align-items: center; justify-content: space-between; padding: 11px 15px; cursor: pointer; transition: background .08s; background: rgba(255,255,255,0.01) !important; width: 100%; }
    .pop-item:not(.pop-item--active):hover { background: rgba(0,0,0,0.04) !important; }
    .pop-item--active { background: #0F0F0F !important; cursor: default; }
    .pop-label { font-size: 13px; font-weight: 500; color: #0F0F0F !important; }
    .pop-item--active .pop-label { color: #FFFFFF !important; }
    .pop-sub   { font-size: 10px; color: #AEAEB2 !important; }
    .pop-item--active .pop-sub { color: #E5E5EA !important; }
    .pop-check { font-size: 11px; color: #0F0F0F !important; font-weight: 600; }
    .pop-item--active .pop-check { color: #FFFFFF !important; }
    .pop-divider { height: 1px; background: #F2F2F7; }

    /* ── DECODE FLOW ────────────────────────────────────────────── */
    .decode-float {
      position: absolute; display: inline-flex; align-items: center; justify-content: center;
      background: var(--black); color: var(--white) !important;
      border-radius: var(--r-pill); padding: 6px 13px;
      font-size: 11px; font-weight: 600; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.18); pointer-events: auto;
      opacity: 0; transform: scale(0.8) translateY(10px);
      transition: all 0.2s var(--spring), width 0.2s var(--spring); z-index: 2147483647;
      min-width: 68px;
    }
    .decode-float--active { opacity: 1; transform: scale(1) translateY(0); }
    .decode-float--loading { cursor: default; pointer-events: none; }
    .decode-float--loading span { animation: t-pulse 1.4s ease-in-out infinite; }

    @keyframes t-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .decode-card {
      position: absolute; width: 288px; background: var(--white) !important;
      border-radius: var(--r-lg); border: 1px solid var(--gray-7);
      box-shadow: var(--sh-lg); overflow: hidden; pointer-events: auto;
      opacity: 0; transform: translateY(20px);
      transition: all 0.2s var(--spring); z-index: 2147483647;
    }
    .decode-card--active { opacity: 1; transform: translateY(0); }
    
    .decode-card-header { padding: 11px 14px; border-bottom: 1px solid var(--gray-8); display: flex; align-items: center; justify-content: space-between; }
    .decode-card-tag { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray-4); }
    .decode-card-close { width: 18px; height: 18px; background: var(--gray-8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gray-4); cursor: pointer; }
    
    .decode-card-body { padding: 14px; }
    .decode-card-text { font-size: 14px; color: var(--black); line-height: 1.55; margin-bottom: 14px; }
    
    .decode-card-copy {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: var(--gray-9); border: 1px solid var(--gray-7); border-radius: var(--r-sm);
      padding: 6px 12px; font-size: 12px; font-weight: 500; color: var(--black);
      cursor: pointer; transition: all .15s ease;
    }
    .decode-card-copy:hover { background: var(--gray-8); border-color: var(--gray-6); }
    .decode-card-copy--copied { background: var(--green) !important; border-color: var(--green) !important; color: var(--white) !important; }

    /* ── TOAST ──────────────────────────────────────────────────── */
    .toast {
      position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%) translateY(20px);
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: var(--r-pill); font-size: 12px; font-weight: 600;
      background: var(--black); box-shadow: var(--sh-md);
      opacity: 0; pointer-events: none; transition: all 0.2s var(--spring); z-index: 2147483647;
    }
    .toast--active { opacity: 1; transform: translateX(-50%) translateY(0); }
    
    .toast--success { color: var(--green); }
    .toast--error   { color: var(--red); }
    .toast--warn    { color: var(--orange); }
    .toast--info    { color: #FFFFFF; }

    .toast-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .toast-dot--success { background: var(--green); }
    .toast-dot--error   { background: var(--red); }
    .toast-dot--warn    { background: var(--orange); }
    .toast-dot--info    { background: #8888ff; }
  `;

  const TONES = [
    { id: 'casual', l: 'Casual', s: 'texting' },
    { id: 'workChat', l: 'Work Chat', s: 'natural' },
    { id: 'formal', l: 'Formal', s: 'professional' }
  ];

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else if (k === 'innerHTML') el.innerHTML = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.toLowerCase().substring(2), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }

  return {
    TONES, h, CSS,
    injectStyles: (root) => {
      const style = document.createElement('style');
      style.textContent = CSS;
      root.appendChild(style);
    },
    injectFonts: () => {
      if (document.getElementById('tonal-fonts')) return;
      const link = h('link', { id: 'tonal-fonts', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' });
      document.head.appendChild(link);
    },
    renderPill: (container, state, toneId, isPopoverOpen, callbacks) => {
      const tone = TONES.find(t => t.id === toneId) || TONES[1];
      if (!container.dataset.tonalInited) {
        container.className = 't-hitbox';
        const pill = h('div', { className: 't-pill' });
        pill.appendChild(h('div', { className: 'pill-icon-rest', innerHTML: SVGS.LOGO }));
        pill.appendChild(h('div', { className: 'pill-icon-active', innerHTML: SVGS.LOGO_SM }));
        pill.appendChild(h('span', { className: 'pill-text' }));
        pill.appendChild(h('div', { className: 'pill-chev-wrap', innerHTML: SVGS.CHEV, onclick: (e) => { e.stopPropagation(); callbacks.onTogglePopover(); } }));
        container.appendChild(pill);
        container.onclick = (e) => { if (!e.target.closest('.pill-chev-wrap')) callbacks.onClick(); };
        container.onmouseenter = () => callbacks.onHover(true);
        container.onmouseleave = () => callbacks.onHover(false);
        container.dataset.tonalInited = "true";
      }
      const pill = container.querySelector('.t-pill');
      const text = container.querySelector('.pill-text');
      pill.className = `t-pill t-pill--${state} ${isPopoverOpen ? 't-pill--popover-open' : ''}`;
      if (state === 'expanded') text.textContent = tone.l;
      else if (state === 'loading') text.textContent = 'Converting...';
      else if (state === 'done') text.textContent = 'Undo';
    },
    createPopover: (activeId, onSelect, onClose, onMouseEnter, onMouseLeave) => {
      // Logic: Explicitly avoid automatic closing on mouseleave to satisfy "Sticky" mandate for click-to-open components.
      const pop = h('div', { className: 'popover', onmouseenter: onMouseEnter, onmouseleave: onMouseLeave });
      TONES.forEach((tone, idx) => {
        const item = h('div', { className: `pop-item ${tone.id === activeId ? 'pop-item--active' : ''}`, onclick: (e) => { e.stopPropagation(); onSelect(tone.id); } },
          h('span', { className: 'pop-label', textContent: tone.l }),
          tone.id === activeId ? h('span', { className: 'pop-check', textContent: '✓' }) : h('span', { className: 'pop-sub', textContent: tone.s })
        );
        pop.appendChild(item);
        if (idx < TONES.length - 1) pop.appendChild(h('div', { className: 'pop-divider' }));
      });
      pop.classList.add('popover--active');
      return pop;
    },
    createDecodeFloat: (onDecode) => {
      return h('div', { className: 'decode-float', onclick: onDecode }, h('span', { textContent: 'Decode' }));
    },
    createDecodeCard: (text, onClose) => {
      const copyBtn = h('div', { className: 'decode-card-copy', innerHTML: `${SVGS.COPY} Copy` });
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(text);
        copyBtn.className = 'decode-card-copy decode-card-copy--copied';
        copyBtn.innerHTML = `${SVGS.CHECK} Copied!`;
        setTimeout(() => {
          copyBtn.className = 'decode-card-copy';
          copyBtn.innerHTML = `${SVGS.COPY} Copy`;
        }, 2000);
      };

      return h('div', { className: 'decode-card' },
        h('div', { className: 'decode-card-header' },
          h('span', { className: 'decode-card-tag', textContent: 'Plain English' }),
          h('div', { className: 'decode-card-close', innerHTML: SVGS.CLOSE, onclick: onClose })
        ),
        h('div', { className: 'decode-card-body' },
          h('div', { className: 'decode-card-text', textContent: text }),
          copyBtn
        )
      );
    },
    showToast: (root, msg, type = 'success') => {
      const toast = h('div', { className: `toast toast--${type}` }, h('div', { className: `toast-dot toast-dot--${type}` }), h('span', { textContent: msg }));
      root.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('toast--active'));
      setTimeout(() => { toast.classList.remove('toast--active'); setTimeout(() => toast.remove(), 200); }, 2500);
    }
  };
})();
