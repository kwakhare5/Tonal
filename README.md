# Tonal Chrome Extension — V2.1.0

Tonal is an "Elite" AI-powered rephrasing engine that shifts the tone of your messages across LinkedIn, Gmail, Slack, and WhatsApp with 1:1 Design System parity.

## 🛠️ Core Components

- **`content.js`**: The main injection engine. Handles platform selectors, DOM mutation, and component logic.
- **`styles.css`**: The literal Design System v2.1.0 tokens and component styles.
- **`sandbox.html`**: The hardened operational mirror for rapid iteration and QA.

---

## 🧪 Developer Sandbox (`sandbox.html`)

The Sandbox is a **Hardened Operational Mirror** for the Tonal interaction engine. It is the primary environment for ensuring visual and functional parity with the master Design System.

### Why We Have It

1. **Isolation**: Test the pill's logic in a clean environment without interference from platform-specific CSS (LinkedIn/Gmail).
2. **Rapid Iteration**: Instant feedback on visual changes without the need to reload the extension or refresh live messaging apps.
3. **Visual Parity**: 1:1 check against the `tonal-design-system-v2.html` source for dimensions, typography, and shadows.
4. **Debugging**: Acts as a diagnostic baseline. If a feature works in the sandbox but fails on a live site, the issue is environmental (selectors/injection).

### Key Features

- **Platform Simulation**: Includes CSS-accurate mockups for LinkedIn and Gmail message fields.
- **State Mimicry**: Simulates the full "Rest → Hover → Expanded → Loading → Done" lifecycle using internal JS timeouts.
- **1:1 Token Rendering**: Uses the exact same CSS variables and structural DOM nodes as the production extension.

---

## 🎨 Design System Parity (V2.1.0)

All components must strictly adhere to the following specifications from Section 05:

- **Rest State**: `30x16px`. Icon only.
- **Hover State**: `scale(1.08)` with shadow increase.
- **Expanded State**: `24px` height. Intrinsic width. `9px` horizontal padding. `5px` internal gap.
- **Typography**: DM Sans 10px Bold (`700`).
- **Colors**: Monochrome palette (`#0F0F0F` black, `#FFFFFF` white).
- **Done State**: Success green (`#34C759`) with soft drop shadow.

---

## 🚀 Development Workflow

1. **Modify CSS/JS**: Update the core logic or design tokens.
2. **Verify in Sandbox**: Open `sandbox.html` in a browser. Ensure the pill behaves and looks exactly like the Design System.
3. **Live Test**: Load the extension in Chrome and verify the injection on LinkedIn or Gmail.
4. **Ship**: Package the zero-bloat, production-ready build.
