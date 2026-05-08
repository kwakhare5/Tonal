/* content.js — Tonal v2.0 (Strict Design System Implementation) */
(function () {
  "use strict";

  const injected = new WeakSet();

  function isContextValid() {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  }

  function getPlatform() {
    const h = location.hostname;
    if (h.includes("mail.google.com")) return "gmail";
    if (h.includes("app.slack.com")) return "slack";
    if (h.includes("web.whatsapp.com")) return "whatsapp";
    if (h.includes("linkedin.com")) return "linkedin";
    return null;
  }

  const SELECTORS = {
    gmail: ['div[aria-label="Message Body"]', '.Am.Al.editable', 'div[g_editable="true"][contenteditable="true"]'],
    slack: ['.ql-editor[contenteditable="true"]', '[data-lexical-editor="true"]', '.p-rich_text_input__editable'],
    whatsapp: ['div[contenteditable="true"][data-tab="10"]', 'footer div[contenteditable="true"]'],
    linkedin: ['.msg-form__contenteditable', '.feed-shared-update-v2__comment-box [contenteditable]']
  };

  function scan() {
    const platform = getPlatform();
    if (!platform) return;
    const selectors = SELECTORS[platform];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!injected.has(el)) {
          inject(el, platform);
          injected.add(el);
        }
      });
    });
  }

  function inject(input, platform) {
    const wrap = document.createElement('div');
    wrap.className = `t-wrap t-wrap--${platform}`;
    wrap._tInput = input;
    
    const btn = makeButton();
    wrap.appendChild(btn);
    
    // Append to documentElement (<html>) to bypass all container clipping
    document.documentElement.appendChild(wrap);
    positionPill(btn, input, platform);

    // Reposition on window resize
    window.addEventListener('resize', () => positionPill(btn, input, platform));
    
    // Observer for input changes to update label
    const observer = new MutationObserver(() => updatePillLabel(btn, input));
    observer.observe(input, { characterData: true, childList: true, subtree: true });

    // Initial check
    updatePillLabel(btn, input);
  }

  function makeButton() {
    const btn = document.createElement('button');
    btn.className = 't-pill t-pill--rest';
    btn.dataset.state = "idle";
    btn.dataset.tone = "workChat";
    
    // Strict SVG from design system (Spec: 13x8px icon)
    btn.innerHTML = `
      <span class="pill-icon">
        <svg width="13" height="8" viewBox="0 0 72 44" fill="none">
          <rect x="0" y="18" width="72" height="8" rx="4" fill="#444"/>
          <rect x="0" y="18" width="39" height="8" rx="4" fill="white"/>
          <circle cx="39" cy="22" r="16" fill="white"/>
          <circle cx="39" cy="22" r="9" fill="#0F0F0F"/>
        </svg>
      </span>
      <span class="pill-text"></span>
      <span class="pill-caret">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1.5 1.5L4 3.5L6.5 1.5" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;

    btn.addEventListener("mouseenter", () => {
      if (btn.dataset.state === "idle") {
        updatePillLabel(btn, btn.closest(".t-wrap")._tInput); // Refresh text
        btn.classList.replace("t-pill--rest", "t-pill--expanded");
      }
    });

    btn.addEventListener("mouseleave", (e) => {
      if (btn.dataset.state === "idle") {
        // Delay collapse to see if we move into the popover
        setTimeout(() => {
          const isOverPopover = document.querySelector(".popover:hover");
          const isOverPill = btn.matches(":hover");
          if (!isOverPopover && !isOverPill) {
            btn.classList.replace("t-pill--expanded", "t-pill--rest");
            closePopover();
          }
        }, 100);
      }
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = getInputText(btn.closest(".t-wrap")._tInput);
      
      if (btn.dataset.state === "undo") {
        handleUndo(btn);
      } else if (text && text.length > 0) {
        handleConvert(btn);
      } else {
        showPopover(btn);
      }
    });

    const caret = btn.querySelector('.pill-caret');
    caret.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPopover(btn);
    });

    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPopover(btn);
    });

    return btn;
  }

  function updatePillLabel(btn, input) {
    if (btn.dataset.state !== "idle") return;
    const text = getInputText(input);
    const label = btn.querySelector(".pill-text");
    if (label) {
      const names = { texting: "Casual", corporate: "Formal", workChat: "Work Chat" };
      const toneName = names[btn.dataset.tone] || "Work Chat";
      
      // If text is present, we show the action "Convert". 
      // If empty, we show the active "Tone Name".
      const newLabel = (text && text.length > 0) ? "Convert" : toneName;
      
      if (label.textContent !== newLabel) label.textContent = newLabel;
    }
  }

  function positionPill(btn, input, isFirstLoad = false) {
    const wrap = btn.closest(".t-wrap");
    const rect = input.getBoundingClientRect();
    
    const isVisible = rect.width > 0 && rect.height > 0;
    if (!isVisible) {
      wrap.style.display = "none";
      return;
    }
    
    wrap.style.display = "block";
    const targetY = rect.top + (rect.height / 2);
    const targetX = rect.left + rect.width;

    // Magnetic Smoothing (Lerp)
    if (isFirstLoad || !wrap._lastX) {
      wrap._lastX = targetX;
      wrap._lastY = targetY;
    } else {
      // 0.15 factor gives it a "magnetic spring" feel
      wrap._lastX += (targetX - wrap._lastX) * 0.15;
      wrap._lastY += (targetY - wrap._lastY) * 0.15;
    }

    wrap.style.top = `${wrap._lastY}px`;
    wrap.style.left = `${wrap._lastX}px`;
    wrap.style.width = "0px";
    wrap.style.height = "0px";
    
    btn.style.position = "absolute";
    btn.style.right = "8px"; 
    btn.style.top = "0";
    btn.style.transform = "translateY(-50%)";
  }

  function watchdog() {
    const wraps = document.querySelectorAll(".t-wrap");
    wraps.forEach(wrap => {
      const input = wrap._tInput;
      const btn = wrap.querySelector(".t-pill");
      
      // 1. Is the textbox dead or removed?
      if (!input || !document.contains(input)) {
        wrap.remove();
        return;
      }

      // 2. Sync position (handles scrolling and dynamic layout shifts)
      positionPill(btn, input, false); 
    });
    requestAnimationFrame(watchdog);
  }

  function showPopover(btn) {
    if (btn.classList.contains("t-pill--popover-open")) {
      closePopover();
      return;
    }
    closePopover();
    btn.classList.add("t-pill--popover-open");
    const input = btn.closest(".t-wrap")._tInput;
    const pop = document.createElement("div");
    pop.className = "popover";
    pop.innerHTML = `
      <button class="popover-item ${btn.dataset.tone === "texting" ? "popover-item--active" : ""}" data-tone="texting">
        <span class="popover-item-label">Casual</span>
        <span class="popover-item-sub">texting ${btn.dataset.tone === "texting" ? "✓" : ""}</span>
      </button>
      <div class="popover-divider"></div>
      <button class="popover-item ${(!btn.dataset.tone || btn.dataset.tone === "workChat") ? "popover-item--active" : ""}" data-tone="workChat">
        <span class="popover-item-label">Work Chat</span>
        <span class="popover-item-sub">default ${(!btn.dataset.tone || btn.dataset.tone === "workChat") ? "✓" : ""}</span>
      </button>
      <div class="popover-divider"></div>
      <button class="popover-item ${btn.dataset.tone === "corporate" ? "popover-item--active" : ""}" data-tone="corporate">
        <span class="popover-item-label">Formal</span>
        <span class="popover-item-sub">professional ${btn.dataset.tone === "corporate" ? "✓" : ""}</span>
      </button>
      <div class="popover-divider"></div>
      <button class="popover-item popover-item--decode" data-tone="decode">
        <span class="popover-item-label">Decode message</span>
        <span class="popover-item-sub">↓</span>
      </button>
    `;

    pop.querySelectorAll(".popover-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const tone = item.dataset.tone;
        closePopover();
        if (tone === "decode") {
          runDecode(btn, input);
        } else {
          btn.dataset.tone = tone;
          const text = getInputText(input);
          if (text && text.trim().length > 0) {
            handleConvert(btn, tone);
          } else {
            // Pre-selection: Just update the label
            updatePillLabel(btn, input);
          }
        }
      });
    });

    pop.addEventListener("mouseleave", () => {
      setTimeout(() => {
        const isOverPill = btn.matches(":hover");
        const isOverPopover = pop.matches(":hover");
        if (!isOverPill && !isOverPopover) {
          btn.classList.replace("t-pill--expanded", "t-pill--rest");
          closePopover();
        }
      }, 100);
    });

    const wrap = btn.closest(".t-wrap");
    const rect = btn.getBoundingClientRect();
    
    document.documentElement.appendChild(pop);
    
    // Position UPWARDS
    const popHeight = pop.offsetHeight;
    pop.style.top = `${rect.top - popHeight - 8}px`;
    pop.style.left = `${rect.right - 200}px`;

    setTimeout(() => document.addEventListener("click", closePopover, { once: true }), 10);
  }

  function closePopover() {
    document.querySelectorAll(".t-pill--popover-open").forEach(b => b.classList.remove("t-pill--popover-open"));
    document.querySelector(".popover")?.remove();
  }

  async function handleConvert(btn, toneOverride) {
    const input = btn.closest(".t-wrap")._tInput;
    const text = getInputText(input);
    const tone = toneOverride || btn.dataset.tone || "workChat";
    
    btn.dataset.original = text;
    btn.dataset.state = "loading";
    btn.className = "t-pill t-pill--loading";
    btn.querySelector(".pill-text").textContent = "Converting";
    btn.querySelector(".pill-text").classList.add("pill-text--dim");

    try {
      chrome.runtime.sendMessage({ type: "TONESHIFT_CONVERT", text, toneLevel: tone }, (res) => {
        if (res?.success) {
          setInputTextWithHighlight(input, text, res.text);
          setDone(btn);
        } else {
          setError(btn, res?.error);
        }
      });
    } catch (e) {
      setIdle(btn);
    }
  }

  const HUMAN_ERRORS = {
    "NO_TEXT": "Type something first",
    "AI_FAILED": "Couldn't rewrite this",
    "AI_BUSY": "AI is busy. Try again soon.",
    "RATE_LIMIT": "Taking a break. Try in 1 min.",
    "NETWORK_ERROR": "Check your internet",
    "SERVER_ERROR": "Something went wrong"
  };

  function setError(btn, errorKey) {
    const msg = HUMAN_ERRORS[errorKey] || HUMAN_ERRORS.SERVER_ERROR;
    btn.dataset.state = "error";
    btn.className = "t-pill t-pill--error";
    btn.querySelector(".pill-text").textContent = msg;
    btn.querySelector(".pill-text").classList.remove("pill-text--dim");
    
    setTimeout(() => {
      if (btn.dataset.state === "error") setIdle(btn);
    }, 3000);
  }

  async function runDecode(btn, input) {
    const text = getInputText(input);
    btn.dataset.state = "loading";
    btn.classList.add("t-pill--expanded");
    btn.querySelector(".pill-text").textContent = "Decoding";

    chrome.runtime.sendMessage({ type: "TONESHIFT_DECODE", text }, (res) => {
      setIdle(btn);
      if (res?.success) showDecodeCard(res.text, btn);
    });
  }

  function showDecodeCard(text, btn) {
    document.querySelector(".card")?.remove();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-label">Plain English</div>
      <div class="card-text" style="font-size:14px; line-height:1.6; margin-bottom:20px;">${text}</div>
      <button class="t-btn-primary">Copy to Clipboard</button>
    `;
    document.body.appendChild(card);
    
    const rect = btn.getBoundingClientRect();
    card.style.top = `${rect.top - card.offsetHeight - 12}px`;
    card.style.left = `${rect.right - card.offsetWidth}px`;

    card.querySelector(".t-btn-primary").addEventListener("click", () => {
      navigator.clipboard.writeText(text);
      showToast("Copied!", "success");
      card.remove();
    });
    
    setTimeout(() => document.addEventListener("click", () => card.remove(), { once: true }), 100);
  }

  function setDone(btn) {
    btn.dataset.state = "undo";
    btn.className = "t-pill t-pill--done";
    btn.querySelector(".pill-text").textContent = "Undo";
    btn.querySelector(".pill-text").classList.remove("pill-text--dim");
    setTimeout(() => { if (btn.dataset.state === "undo") setIdle(btn); }, 5000);
  }

  function setIdle(btn) {
    btn.dataset.state = "idle";
    btn.className = "t-pill t-pill--rest";
    updatePillLabel(btn, btn.closest(".t-wrap")?._tInput);
  }

  function handleUndo(btn) {
    const input = btn.closest(".t-wrap")._tInput;
    if (btn.dataset.original) setInputText(input, btn.dataset.original);
    setIdle(btn);
  }

  function getInputText(el) {
    // Platform-specific filter: On WhatsApp, ignore quoted messages (replies)
    const clone = el.cloneNode(true);
    // WhatsApp quoted text usually resides in a div with data-testid="quoted-message" or similar
    // We remove elements that look like quotes to only get the NEWLY typed text
    clone.querySelectorAll('[data-testid*="quote"], [class*="quoted"], [class*="copyable-text"]').forEach(q => q.remove());
    
    return (clone.innerText || clone.textContent || "").trim();
  }

  function setInputText(el, text) {
    if (el.isContentEditable) {
      // Precise selection lock
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      document.execCommand('insertText', false, text);
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function setInputTextWithHighlight(el, oldText, newText) {
    if (!el.isContentEditable) { setInputText(el, newText); return; }
    
    // 1. Precise Focus
    el.focus();
    
    // 2. Native Insert (Zero-HTML Strategy)
    // We clear and insert using ONLY native text commands. 
    // This satisfies LinkedIn/Slack/Gmail internal state models.
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    document.execCommand('delete', false, null);
    
    // Insert the pure text
    document.execCommand('insertText', false, newText);
    
    // 3. Native Highlighting
    // We color the text WITHOUT adding <span> tags. 
    // This is invisible to the site's "Illegal HTML" detectors.
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('hiliteColor', false, 'rgba(255, 233, 153, 0.45)');
    
    // Move cursor to the end
    sel.collapseToEnd();
    
    // 4. Force state sync
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    
    // 5. STICKY CLEANUP (The Native Way)
    const cleanup = (e) => {
      // Ignore functional keys (Ctrl, Shift, etc.)
      if (e.key && e.key.length === 1) {
        // Selection lock for the whole text
        const fullRange = document.createRange();
        fullRange.selectNodeContents(el);
        const fullSel = window.getSelection();
        fullSel.removeAllRanges();
        fullSel.addRange(fullRange);
        
        // Remove formatting and background color
        document.execCommand('hiliteColor', false, 'transparent');
        document.execCommand('removeFormat', false, null);
        
        // Move cursor back to the end so typing continues normally
        fullSel.collapseToEnd();
        
        el.removeEventListener('keydown', cleanup);
        el._tCleanupActive = false;
      }
    };

    if (el._tCleanupActive) el.removeEventListener('keydown', el._tCleanup);
    el._tCleanup = cleanup;
    el._tCleanupActive = true;
    el.addEventListener('keydown', cleanup);
  }

  function positionPill(btn, input, isFirstLoad = false) {
    const wrap = btn.closest(".t-wrap");
    if (!wrap) return;
    
    const rect = input.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    
    if (!isVisible) {
      wrap.style.display = "none";
      return;
    }
    
    wrap.style.display = "block";
    
    // Magnetic Logic
    const targetY = rect.top + (rect.height / 2);
    // Inner-Right Pivot with Safety Offset
    const targetX = rect.left + rect.width - 15;

    if (isFirstLoad || !wrap._lastX) {
      wrap._lastX = targetX;
      wrap._lastY = targetY;
    } else {
      // High-performance magnetic drift
      wrap._lastX += (targetX - wrap._lastX) * 0.25;
      wrap._lastY += (targetY - wrap._lastY) * 0.25;
    }

    wrap.style.top = `${wrap._lastY}px`;
    wrap.style.left = `${wrap._lastX}px`;
    wrap.style.zIndex = "2147483647"; // Absolute top
    
    btn.style.position = "absolute";
    btn.style.right = "8px"; 
    btn.style.top = "0";
    btn.style.transform = "translateY(-50%)";
  }

  function showToast(msg, type) {
    let t = document.getElementById("t-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "t-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `t-toast--${type}`;
    t.classList.add("t-toast--show");
    setTimeout(() => t.classList.remove("t-toast--show"), 3000);
  }

  // Init
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
  watchdog();

})();
