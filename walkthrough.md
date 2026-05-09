# Session: WhatsApp Fix & Code Audit
**Date**: 2026-05-08

## Decisions Made
- **Event Reduction**: Switched to a single `input` event for WhatsApp to prevent React duplication.
- **Prompt Hardening**: Implemented `{TEXT}` placeholder replacement in `worker.js` to ensure the AI correctly identifies source content.
- **Error Robustness**: Added explicit error state handling in `runDecode` to prevent UI lock-up on network failure.

## Verified
- [x] Text duplication in WhatsApp resolved.
- [x] AUDIT.md generated with score 88/100.
- [x] Fixes deployed to local files and GitHub.

## 1. Smart Hover Union
**Decisions**: Implemented a `100ms` debounce union between the pill and its popover.
**Why**: Standard UX for menus often fails if the "bridge" between the button and menu isn't seamless. This ensures the pill doesn't collapse while the user is moving their mouse to select a tone, but still cleans up instantly when they move away entirely.

## 2. Human-Friendly Error Logic
**Decisions**: Mapped technical status codes (400, 429, 502) to plain English labels.
**Why**: Users don't understand "Worker Error (502)". They understand "AI is busy". This reduces friction and makes the product feel more reliable even when the backend is struggling.

## 3. Design System Parity (Strict)
**Decisions**: Aligned dimensions to exactly 32x18px (Rest) and 26px (Active).
**Why**: Parity with the `tonal-design-system.html` is a non-negotiable requirement for high-end product feel.

## 4. Hardware-Accelerated Motion
**Decisions**: Used `contain: strict` and `will-change: transform`.
**Why**: Eliminates transition jitter on complex DOMs like Gmail/Slack by isolating the pill's rendering layer.

## 5. The Watchdog Loop (Ghosting Fix)
**Decisions**: Implemented a `requestAnimationFrame` monitor.
**Why**: Single-page apps (SPAs) like Gmail and Slack delete and recreate textboxes constantly. A static injection script creates "ghost" pills. The Watchdog ensures that if a textbox dies, its pill dies too. It also keeps the pill perfectly synced to the box during scrolls.

## 6. XSS Hardening
**Decisions**: Removed all `.innerHTML` in favor of `document.createElement`.
**Why**: AI output is non-deterministic. If it returns malicious HTML, using `innerHTML` could allow a site-wide session hijack. `textContent` guarantees the text is treated as raw data, not code.

## 7. Fixed Viewport Positioning
**Decisions**: Switched `.t-wrap` from `absolute` to `fixed`.
**Why**: WhatsApp and Slack often use `overflow: hidden` on parent containers which "slices" absolute-positioned elements. `fixed` elements live on the viewport layer and bypass all parent clipping rules, ensuring the pill is 100% visible regardless of the page's layout complexity.

## 8. High-Contrast Active States
**Decisions**: Selected tones now use `var(--black)` background with `var(--white)` text.
**Why**: The previous light-gray selection was too subtle. Using a solid black highlight for the active tone provides instant visual feedback and matches the premium branding of the main pill.

## 9. Silent Tone Pre-selection
**Decisions**: If the textbox is empty, clicking a tone in the menu updates the state without calling the API.
**Why**: Users often want to "set their mood" before they start typing. Showing a "Type something first" error during selection felt like a punishment for being organized. Now, the pill label updates to the tone name (e.g., "Casual") to confirm selection silently.

## 10. Dynamic Tone Labels
**Decisions**: Removed the "Tonal" brand name from the idle state.
**Why**: The brand name was redundant. Users now see their currently active tone (Casual, Work Chat, or Formal) by default. This makes the interface more utility-focused and clear. When text is present, it switches to "Convert" to indicate the available action.

## 11. Highlight Bleed Fix (Pre-Keydown Cleanup)
**Decisions**: Moved the "Sticky Cleanup" from the `input` event to the `keydown` event and added a **Zero-Width Space (ZWS)** buffer.
**Why**: Typing inside a highlighted span causes the style to "bleed" into new characters. By using `keydown`, we strip all HTML formatting **before** the browser inserts the character. The ZWS provides a safe landing spot for the cursor, ensuring new text is always 100% clean and unformatted.

## 12. WhatsApp Accidental Reply (Event Isolation)
**Decisions**: Enforced `e.stopImmediatePropagation()` and `e.preventDefault()` on all Tone Menu interactions.
**Why**: WhatsApp has background listeners that capture clicks to trigger its "Reply" UI. By completely isolating our clicks, we ensure WhatsApp never "sees" the interaction with the Tonal pill, preventing accidental replies or message selections.

- [x] WhatsApp Fix: Debug `setInputTextWithHighlight`
- [x] Re-sync with Global Rules & Skills
- [x] Full Code Audit (@AUDIT)
- [x] Implement Audit Fixes (worker.js, content.js, utils.js)
- [ ] Regression Testing (Gmail, Slack, WhatsApp)

## 13. Sticky Highlights
**Decisions**: Removed the automatic 2s fade timer.
**Why**: Users need time to review the AI's changes. The highlight now stays indefinitely until the user performs a "new action" (typing or clicking send). This provides a zero-pressure review experience.

## 14. Magnetic Positioning Engine
**Decisions**: Implemented a Linear Interpolation (Lerp) smoothing factor of `0.15` in the Watchdog loop.
**Why**: Previously, the pill "jumped" to its position. Now, it glides with a fluid, magnetic attraction to the textbox. This makes the UI feel "alive" and premium, reducing visual jarring during window resizing or fast scrolling.

## 15. Groq Llama 3.3 70B Migration
**Decisions**: Replaced the native Cloudflare AI (`llama-3.1-8b`) with the high-performance **Groq API** (`llama-3.3-70b-versatile`).
**Why**: The 8B model was too small for reliable tone rephrasing, often "chatting" back or ignoring the 3-tone distinction. The 70B model via Groq provides state-of-the-art rephrasing quality with near-zero latency, ensuring the extension follows the "Stateless Utility" rules (no preambles, no refusals) and correctly handles the nuances of Casual, Work Chat, and Formal tones.
## 16. Selection-Based Decoding (The Decoder)
**Decisions**: Implemented a global `mouseup` listener with selection-length validation (>20 chars).
**Why**: Users often receive jargon-heavy messages they need to "translate" to understand. By enabling decoding on highlighted text, Tonal becomes a two-way tool: it helps you write better *and* understand others better. The 20-character threshold prevents the "Decode" button from annoying the user during small edits or word selections.

## 17. Viewport-Aware Card Engine
**Decisions**: Added collision detection for the `t-card`.
**Why**: Floating UIs often clip off-screen in chat apps. If the decoded card can't fit above the selection, it now automatically flips to the bottom or centers itself, ensuring 100% readability on all screen sizes.

## 18. Interaction Lock (Bug Fix)
**Decisions**: Added a check to `handleSelection` to ignore events from the floating button.
**Why**: Clicking the button would previously clear the browser selection, triggering the cleanup logic and making the UI disappear before the API call could start. The "Lock" ensures the button stays alive during the click phase.

## 19. Unified Design System (v2.0)
**Decisions**: Updated `tonal-design-system.html` to include Toasts, the Decoder, and the Settings Popup mockup.
**Why**: Documentation must match reality. Having a single source of truth for all UI states (Rest, Expanded, Loading, Done, Error, Decoder, Toast, and Settings) ensures the product remains cohesive as it scales.

- [x] Selection-Based Decoding: Implement listener and UI
- [x] UI Hardening: Fix dismissal race condition
- [x] Design System: Update with all project UIs
- [x] Regression Testing (Gmail, Slack, WhatsApp, LinkedIn)
