# Session Walkthrough — Interaction & Design Finalization

### 1. Smart Hover Union
**Decisions**: Implemented a `100ms` debounce union between the pill and its popover.
**Why**: Standard UX for menus often fails if the "bridge" between the button and menu isn't seamless. This ensures the pill doesn't collapse while the user is moving their mouse to select a tone, but still cleans up instantly when they move away entirely.

### 2. Human-Friendly Error Logic
**Decisions**: Mapped technical status codes (400, 429, 502) to plain English labels.
**Why**: Users don't understand "Worker Error (502)". They understand "AI is busy". This reduces friction and makes the product feel more reliable even when the backend is struggling.

### 3. Design System Parity (Strict)
**Decisions**: Aligned dimensions to exactly 32x18px (Rest) and 26px (Active).
**Why**: Parity with the `tonal-design-system.html` is a non-negotiable requirement for high-end product feel.

### 4. Hardware-Accelerated Motion
**Decisions**: Used `contain: strict` and `will-change: transform`.
**Why**: Eliminates transition jitter on complex DOMs like Gmail/Slack by isolating the pill's rendering layer.

### 5. The Watchdog Loop (Ghosting Fix)
**Decisions**: Implemented a `requestAnimationFrame` monitor.
**Why**: Single-page apps (SPAs) like Gmail and Slack delete and recreate textboxes constantly. A static injection script creates "ghost" pills. The Watchdog ensures that if a textbox dies, its pill dies too. It also keeps the pill perfectly synced to the box during scrolls.

### 6. XSS Hardening
**Decisions**: Removed all `.innerHTML` in favor of `document.createElement`.
**Why**: AI output is non-deterministic. If it returns malicious HTML, using `innerHTML` could allow a site-wide session hijack. `textContent` guarantees the text is treated as raw data, not code.

### 7. Fixed Viewport Positioning
**Decisions**: Switched `.t-wrap` from `absolute` to `fixed`.
**Why**: WhatsApp and Slack often use `overflow: hidden` on parent containers which "slices" absolute-positioned elements. `fixed` elements live on the viewport layer and bypass all parent clipping rules, ensuring the pill is 100% visible regardless of the page's layout complexity.

### 8. High-Contrast Active States
**Decisions**: Selected tones now use `var(--black)` background with `var(--white)` text.
**Why**: The previous light-gray selection was too subtle. Using a solid black highlight for the active tone provides instant visual feedback and matches the premium branding of the main pill.

### 9. Silent Tone Pre-selection
**Decisions**: If the textbox is empty, clicking a tone in the menu updates the state without calling the API.
**Why**: Users often want to "set their mood" before they start typing. Showing a "Type something first" error during selection felt like a punishment for being organized. Now, the pill label updates to the tone name (e.g., "Casual") to confirm selection silently.

### 10. Dynamic Tone Labels
**Decisions**: Removed the "Tonal" brand name from the idle state.
**Why**: The brand name was redundant. Users now see their currently active tone (Casual, Work Chat, or Formal) by default. This makes the interface more utility-focused and clear. When text is present, it switches to "Convert" to indicate the available action.

### 11. Highlight Bleed Fix (Pre-Keydown Cleanup)
**Decisions**: Moved the "Sticky Cleanup" from the `input` event to the `keydown` event and added a **Zero-Width Space (ZWS)** buffer.
**Why**: Typing inside a highlighted span causes the style to "bleed" into new characters. By using `keydown`, we strip all HTML formatting **before** the browser inserts the character. The ZWS provides a safe landing spot for the cursor, ensuring new text is always 100% clean and unformatted.

### 12. WhatsApp Accidental Reply (Event Isolation)
**Decisions**: Enforced `e.stopImmediatePropagation()` and `e.preventDefault()` on all Tone Menu interactions.
**Why**: WhatsApp has background listeners that capture clicks to trigger its "Reply" UI. By completely isolating our clicks, we ensure WhatsApp never "sees" the interaction with the Tonal pill, preventing accidental replies or message selections.

### 13. Sticky Highlights
**Decisions**: Removed the automatic 2s fade timer.
**Why**: Users need time to review the AI's changes. The highlight now stays indefinitely until the user performs a "new action" (typing or clicking send). This provides a zero-pressure review experience.

### 14. Magnetic Positioning Engine
**Decisions**: Implemented a Linear Interpolation (Lerp) smoothing factor of `0.15` in the Watchdog loop.
**Why**: Previously, the pill "jumped" to its position. Now, it glides with a fluid, magnetic attraction to the textbox. This makes the UI feel "alive" and premium, reducing visual jarring during window resizing or fast scrolling.
