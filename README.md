# Tonal Chrome Extension — V5.5.0

Tonal is an "Elite" AI-powered rephrasing engine that shifts the tone of your messages across LinkedIn, Gmail, Slack, and WhatsApp with 1:1 Design System parity.

## 🛠️ Core Components

- **`src/extension/content.js`**: The main injection engine. Handles platform selectors, DOM mutation, and component logic.
- **`src/extension/adapters/`**: Platform-specific DOM interaction adapters to ensure pristine text injection across complex rich-text frameworks (Draft.js, Lexical, Quill).
  - `whatsapp.js`
  - `linkedin.js`
  - `slack.js`
  - `gmail.js`
  - `default.js`
  - `manager.js`
- **`src/extension/background.js`**: Service worker for Cloudflare proxy communication, state management, and circuit-breaking.
- **`src/core/tonal.js`**: The literal Design System v2.1.0 tokens and UI component classes.

---

## 🎨 Design System Parity (V2.1.0)

All components strictly adhere to the following specifications from Section 05:

- **Rest State**: `30x16px`. Icon only.
- **Hover State**: `scale(1.08)` with shadow increase.
- **Expanded State**: `24px` height. Intrinsic width. `9px` horizontal padding. `5px` internal gap.
- **Typography**: DM Sans 10px Bold (`700`).
- **Colors**: Monochrome palette (`#0F0F0F` black, `#FFFFFF` white).
- **Done State**: Success green (`#34C759`) with soft drop shadow.

---

## 🚀 Architecture

Tonal utilizes a robust **Adapter Pattern Architecture** to maintain cross-platform stability. Instead of relying on a monolithic DOM injection script, the `content.js` engine delegates text insertion, extraction, and selection to framework-specific adapters. This guarantees 100% stability against React/Draft.js and Meta/Lexical reconcilers.

API requests are routed through a secure **Cloudflare Worker Proxy**, completely eliminating client-side API key exposure while maintaining ultra-low latency inference via Groq's LLaMA 3.3 70B model.
