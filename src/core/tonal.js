/**
 * TONAL MASTER ENGINE v4.0.0
 * 1:1 Elite Design System | State-Driven | Shadow DOM Pure
 */

window.Tonal = (function() {
  const SVGS = {
    REST: `<svg width="13" height="8" viewBox="0 0 72 44" fill="none"><rect x="0" y="18" width="72" height="8" rx="4" fill="#3A3A3C"/><rect x="0" y="18" width="39" height="8" rx="4" fill="white"/><circle cx="39" cy="22" r="15" fill="white"/><circle cx="39" cy="22" r="9" fill="#0F0F0F"/></svg>`,
    ICON: `<svg width="11" height="7" viewBox="0 0 72 44" fill="none"><rect x="0" y="18" width="72" height="8" rx="4" fill="#3A3A3C"/><rect x="0" y="18" width="39" height="8" rx="4" fill="white"/><circle cx="39" cy="22" r="15" fill="white"/><circle cx="39" cy="22" r="9" fill="#0F0F0F"/></svg>`,
    CHEV: `<svg width="7" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };

  const CSS = `
    :host {
      --black: #0F0F0F; --white: #FFFFFF; --green: #34C759; --red: #FF3B30;
      --gray: #AEAEB2; --gray-4: #3A3A3C; --gray-5: #8E8E93; --gray-6: #AEAEB2; --gray-7: #E5E5EA; --gray-8: #F2F2F7; --gray-9: #F9F9FB;
      --font: 'DM Sans', -apple-system, sans-serif;
      --sh-xs: 0 1px 3px rgba(0, 0, 0, .16);
      --sh-lg: 0 8px 24px rgba(0, 0, 0, .1), 0 24px 64px rgba(0, 0, 0, .12);
      --ease: cubic-bezier(0.2, 0, 0, 1);
    }
    .t-pill {
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--black); border-radius: 100px; cursor: pointer;
      box-shadow: var(--sh-xs); transition: all .2s var(--ease);
      user-select: none; box-sizing: border-box; position: relative;
    }
    .t-pill--rest { width: 30px; height: 16px; }
    .t-pill--expanded { height: 24px; padding: 0 9px; gap: 5px; }
    .t-pill--loading { height: 24px; padding: 0 9px; opacity: 0.5; }
    .t-pill--done { height: 24px; padding: 0 10px; background: var(--green); }
    
    .t-label { font-size: 10px; font-weight: 700; color: white; white-space: nowrap; font-family: var(--font); }
    .t-icon { display: flex; align-items: center; position: relative; width: 10px; height: 10px; }
    
    .popover { 
      position: absolute; bottom: calc(100% + 8px); right: 0;
      width: 192px; background: var(--white); border-radius: 14px;
      border: 1px solid var(--gray-7); box-shadow: var(--sh-lg); 
      overflow: hidden; opacity: 0; transform: translateY(8px); 
      transition: all .2s var(--ease); pointer-events: none; font-family: var(--font);
      display: flex; flex-direction: column; z-index: 1000;
    }
    .popover--active { opacity: 1; transform: translateY(0); pointer-events: auto; }
    
    .pop-item { 
      display: flex; align-items: center; justify-content: space-between; 
      padding: 11px 15px; cursor: pointer; transition: background .08s; 
      background: var(--white); text-decoration: none;
    }
    .pop-item:not(.pop-item--active):hover { background: var(--gray-9); }
    .pop-item--active { background: var(--black); cursor: default; }
    
    .pop-label { font-size: 13px; font-weight: 500; color: var(--black); }
    .pop-sub { font-size: 10px; color: var(--gray-5); margin-left: 4px; }
    .pop-check { color: var(--black); font-size: 14px; display: flex; align-items: center; }

    .pop-item--active .pop-label { color: var(--white); }
    .pop-item--active .pop-check { color: var(--white); }

    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--black); color: white; padding: 8px 16px; border-radius: 100px;
      font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;
      opacity: 0; transition: all 0.4s var(--ease); box-shadow: var(--sh-lg); font-family: var(--font);
      z-index: 10000;
    }
    .toast--active { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

    .dots::after { content: ''; animation: dots 1.2s steps(4) infinite; }
    @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
  `;

  const TONES = [
    { id: 'casual', l: 'Casual', s: 'texting' },
    { id: 'workChat', l: 'Work Chat', s: 'professional' },
    { id: 'formal', l: 'Formal', s: 'professional' }
  ];

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'innerHTML') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.toLowerCase().substring(2), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }

  return {
    createPill(state, toneId, callbacks) {
      const tone = TONES.find(t => t.id === toneId) || TONES[1];
      const pill = h('div', { className: `t-pill t-pill--${state}` });
      
      if (state === 'rest') pill.innerHTML = SVGS.REST;
      else if (state === 'expanded') {
        pill.innerHTML = SVGS.ICON;
        pill.appendChild(h('span', { className: 't-label', innerHTML: tone.l }));
        pill.appendChild(h('div', { className: 't-icon', innerHTML: SVGS.CHEV, onclick: (e) => {
          e.stopPropagation(); callbacks.onTogglePopover();
        }}));
      } else if (state === 'loading') pill.appendChild(h('span', { className: 't-label dots', innerHTML: 'Converting' }));
      else if (state === 'done') pill.appendChild(h('span', { className: 't-label', innerHTML: 'Undo' }));

      pill.onclick = (e) => { if (!e.target.closest('.t-icon')) callbacks.onClick(); };
      return pill;
    },

    createPopover(activeId, onSelect) {
      const pop = h('div', { className: 'popover' });
      TONES.forEach((t, i) => {
        const isActive = t.id === activeId;
        const item = h('div', { 
          className: `pop-item ${isActive ? 'pop-item--active' : ''}`, 
          onclick: () => onSelect(t.id) 
        },
          h('div', {}, 
            h('span', { className: 'pop-label', innerHTML: t.l }), 
            isActive ? null : h('span', { className: 'pop-sub', innerHTML: t.s })
          ),
          h('div', { className: 'pop-check' }, isActive ? '✓' : '')
        );
        pop.appendChild(item);
        if (i < TONES.length - 1) pop.appendChild(h('div', { style: 'height:1px; background:var(--gray-8)' }));
      });
      return pop;
    },

    showToast(shadow, msg) {
      const t = h('div', { className: 'toast' }, h('div', { className: 'toast-dot' }), msg);
      shadow.appendChild(t);
      requestAnimationFrame(() => t.classList.add('toast--active'));
      setTimeout(() => { t.classList.remove('toast--active'); setTimeout(() => t.remove(), 400); }, 3000);
    },

    injectStyles(shadow) {
      const s = document.createElement('style'); s.textContent = CSS; shadow.appendChild(s);
    },

    h
  };
})();
