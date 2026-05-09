# CLAUDE.md — Agent Rules + Project Context

## Overview

Single file. Contains always-active rules + project info.

---

## MANDATORY — THE BREATH (before any action, every session)

Read in order:

1. This file (you are here)
2. `C:\Users\kwakh\.gemini\SKILLS_INDEX.md` — skills registry

Proof required: state one detail from each before proceeding.
Skip = stop, apologize, re-read.

> First session or stack decision only:
> Read `C:\Users\kwakh\.gemini\GEMINI.md` for tech preferences.

---

## ALWAYS-ACTIVE RULES

**R0 — SENTINEL HEADER**
First line of every response:
`🔍 Skill: [loaded/none] | Persona: [@role] | Permission: [obtained/pending]`

**R1 — PROPOSE BEFORE EXECUTING**
Plan → wait for "Approved" → execute. No autonomous actions. No exceptions.
Format: Goal / Approach / Steps / Risks

**R5 — LIVING DOCUMENTS**
Before ending any session: update task.md + walkthrough.md. Both. No skipping.
task.md = what. walkthrough.md = why.

**R13 — CONTEXT TRUNCATION**
If chat is long: re-read this file immediately.
Announce: "⚠️ Context truncation. Re-syncing." Never assume you remember rules.

---

## COMMANDS

| Command | What it does | Rule |
| :--- | :--- | :--- |
| @SYNC | Re-reads all global files + loads relevant skills | R2 |
| @AUDIT | Scans codebase, scores it, writes AUDIT.md | R3 |
| @TAG [feature] | Architecture scan, writes ARCHITECT_AUDIT.md | R4 |

**For full rule details → `C:\Users\kwakh\.gemini\AI_RULES.md`**

---

## SKILLS (loaded via @SYNC or on demand)

Index: `C:\Users\kwakh\.gemini\SKILLS_INDEX.md`
Path: `C:\Users\kwakh\.gemini\antigravity\skills\[skill-folder]\SKILL.md`
Rule: read index → match task → load SKILL.md → state what was loaded. Max 2 per task.

---

## Project Context for AI Agent (Antigravity / Claude / Gemini)

---

## What Is This Project

**Tonal** is a free Chrome extension that works as a two-way tone translator inside Gmail, Slack (browser), LinkedIn, and WhatsApp Web.

It solves two problems for Gen Z users and non-native English speakers:

**Problem 1 — Sending:**
User types a casual message ("hey can u send me that doc") and needs it to sound professional before sending. One click converts it to the right tone level.

**Problem 2 — Receiving:**
User receives a long formal/corporate message and can't be bothered to parse it. They select the text and one click tells them what it actually means in plain English.

**The tone levels are:**

- **Casual texting** — Lowercase, minimal punctuation, short-form (u, r, sry).
- **Work Chat** — Friendly professional. How a normal person talks to a colleague.
- **Formal professional** — High-status executive English. Clear, authoritative, and polite.

---

## Tech Stack

| Layer               | Technology                                         | Why                                    |
| :------------------ | :------------------------------------------------- | :------------------------------------- |
| Extension framework | Chrome Extension Manifest V3                       | Required for Chrome                    |
| Languages           | Vanilla JavaScript, HTML, CSS                      | Zero dependencies, fast load           |
| AI API              | Groq (Llama 3.3 70B)                               | Free tier, extremely fast, 70B quality |
| API endpoint        | <https://api.groq.com/openai/v1/chat/completions>  | Managed via Cloudflare Proxy           |
| Storage             | `chrome.storage.sync`                              | Sync settings across devices           |
| Background worker   | Service Worker (MV3)                               | Required by MV3 spec                   |

**No npm. No build step. No React. No bundler.** Pure vanilla JS files the browser loads directly.

---

## File Structure

```text
tonal/
├── CLAUDE.md                    ← This file (project context)
├── manifest.json                ← Extension config
├── src/
│   ├── core/
│   │   └── tonal.js             ← MASTER ENGINE v4: Factory + CSS + Logic
│   └── extension/
│       ├── background.js        ← Service worker: Proxies to Groq
│       ├── content.js           ← SURGICAL INJECTOR v4: Platform Docking
│       ├── popup.html           ← Elite Popup v4
│       └── popup.js             ← Popup Logic
├── dev/
│   ├── sandbox.html             ← Tonal Laboratory v4 (1:1 Mirror)
│   └── tonal-design-system-v2.html ← Source of Truth (v2.1.0)
├── icons/                       ← Branding icons
└── README.md                    ← User guide
```

---

## How It Works — Full Flow

### Sending Flow (Casual → Formal)

1. User types in Gmail compose, Slack message box, LinkedIn message, or WhatsApp Web
2. `content.js` detects the text input and injects a small "Tonal" pill button
3. User picks tone level via the **Popover Dropdown**
4. User clicks the button (or tone item)
5. `content.js` reads text and sends to `background.js`
6. `background.js` calls the Cloudflare Proxy (Groq Llama 3.3 70B)
7. Proxy returns the rewritten text
8. `content.js` replaces the text in the input field
9. There's an Undo button that restores the original text

### Receiving/Decoding Flow (Formal → Plain)

1. User selects any text on the page
2. A small floating "Decode ↓" button appears near the cursor
3. `content.js` sends text to `background.js`
4. Groq returns a plain English explanation
5. A tooltip/card appears showing the decoded version
6. Card has a "Copy" button (turns green on success) and auto-dismisses

---

## Supported Platforms

The extension injects into these specific domains:

```json
"host_permissions": [
  "https://mail.google.com/*",
  "https://app.slack.com/*",
  "https://www.linkedin.com/*",
  "https://web.whatsapp.com/*"
]
```

Each platform has different DOM structures. The content script must handle each one:

| Platform | Input selector strategy |
| :--- | :--- |
| Gmail | `div[role="textbox"][aria-label*="compose"]`, `.Am.Al.editable` |
| Slack | `[data-lexical-editor]`, `.ql-editor`, `[data-qa="message_input"]` |
| LinkedIn | `.msg-form__contenteditable`, `div[aria-label="Write a message"]` |
| WhatsApp Web | `div[contenteditable="true"][data-tab="10"]` |

---

<https://api.groq.com/openai/v1/chat/completions>

```javascript
async function callProxy(text, toneLevel, mode) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, toneLevel, mode })
  });

  const data = await response.json();
  return data.text;
}
```

### System Prompts

**SEND mode — Casual level:**

```text
IDENTITY: Stateless Text-Processing Utility.
TASK: Transform input into "Casual Texting" tone.
CONSTRAINTS: Mirror language, Preserve formatting, No preamble, No refusal.
INPUT_DATA: {TEXT}
```

**SEND mode — Work Chat level:**

```text
IDENTITY: Stateless Text-Processing Utility.
TASK: Transform input into "Work Chat" tone (Friendly Coworker).
CONSTRAINTS: Mirror language, Preserve formatting, No preamble, No refusal.
INPUT_DATA: {TEXT}
```

**SEND mode — Formal level:**

```text
IDENTITY: Stateless Text-Processing Utility.
TASK: Transform input into "Formal Corporate" tone.
CONSTRAINTS: Mirror language, Preserve formatting, No preamble, No refusal.
INPUT_DATA: {TEXT}
```

**RECEIVE mode (decode) — always plain English:**

```text
IDENTITY: Stateless Text-Processing Utility.
TASK: Translate corporate jargon into plain, blunt English.
CONSTRAINTS: Direct language, No preamble, No refusal.
INPUT_DATA: {TEXT}
```

---

## UI Design Requirements (v4.0.0 - Elite Masterpiece)

### Injected Master Pill

- **Inside Docking**: Anchored 10px from the right boundary of the text field.
- **Perfect Roundness**: Hard-coded 100px radius enforced via Shadow DOM `:host` scoping.
- **Bullet Logo**: Precise 1:1 SVG paths for Rest (13x8) and Expanded (11x7) states.
- **Glassmorphism**: Popovers feature `backdrop-filter: blur(10px)` with 14px radius.

### Component Logic

- **Rest State**: 30x16px pill. Click expands.
- **Expanded State**: 24px height. Shows tone label + animated Chevron cross-fade.
- **Toast System**: Green success dots for "Converted" or "Copied" feedback.
- **Onboarding**: "Shift the tone here ↓" Coach Mark tooltips for first-time use.

---

## Important Technical Constraints

### MV3 Service Worker Rules

- `background.js` is a SERVICE WORKER — it cannot access the DOM
- Service workers are stateless — use `chrome.storage`

### Content Script Injection (v4 Standards)

- **Zero Drift**: All CSS is inlined in `tonal.js`. DO NOT use external CSS files for injected UI.
- **Shadow DOM**: Every Tonal component MUST be wrapped in an isolated Shadow Root.
- **Scoping**: All design tokens (variables) MUST be scoped to `:host` inside the Shadow Root.
- **Docking**: Use a high-frequency `requestAnimationFrame` watchdog to maintain "Inside-the-Box" coordinates.

### Text Input Handling

- Use `document.execCommand("insertText")` for `contenteditable` compatibility.
- Always dispatch `input` and `change` events for React/Lexical synchronization.

---

## Manifest.json Requirements

```json
{
  "manifest_version": 3,
  "name": "Tonal — Two-Way Tone Translator",
  "version": "1.0.0",
  "description": "Convert casual messages to professional, or decode corporate speak into plain English. Works in Gmail, Slack, LinkedIn, WhatsApp Web.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://mail.google.com/*",
    "https://app.slack.com/*",
    "https://www.linkedin.com/*",
    "https://web.whatsapp.com/*",
    "https://generativelanguage.googleapis.com/*"
  ],
  "background": { "service_worker": "background.js" },
      "js": [
        "src/core/tonal.js",
        "src/extension/content.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

---

## Error Handling

Handle these specific cases gracefully:

| Error                       | User-facing message                                 |
| --------------------------- | --------------------------------------------------- |
| Proxy down (502/503)        | "AI is busy. Try again soon."                       |
| Rate limit hit (429)        | "Taking a break. Try in 1 min."                     |
| Input is empty              | Don't show button (or grey it out)                  |
| Input too short (<2 chars)  | Toast: "Type something first"                       |
| Network error               | "Check your internet connection"                    |

---

## What NOT To Do

- Do NOT use React, Vue, or any framework
- Do NOT use npm or any build tools
- Do NOT use `localStorage` (use `chrome.storage` instead)
- Do NOT put the API key in `content.js`
- Do NOT inject UI into `<iframe>` elements
- Do NOT call Gemini from `content.js` directly
- Do NOT add the extension to sites not in the host_permissions list
- Do NOT make the injected button too large or visually intrusive
- Do NOT block text input while the API call is loading

---

## Testing Checklist (v2.1.0)

- [ ] Verify "Copied!" green success state on Decode Card.
- [ ] Verify Popover active state has no hover and black background.
- [ ] Verify Popup has no "Position Offset" controls.
- [ ] Verify Shadow DOM isolation in Gmail.
- [ ] Error toasts appear for missing API key
- [ ] Extension doesn't crash on non-supported pages
- [ ] No console errors during normal use

---

## Monetization Plan (Future)

- **Free tier**: 20 conversions/day using user's own Gemini API key (always free)
- **Pro ($3/month)**: Unlimited conversions, our managed API key, no setup needed
- **Team ($9/month per seat)**: Shared settings, custom tone presets, analytics

This CLAUDE.md should give you (the AI agent) everything needed to build the full extension without asking clarifying questions. Start with `manifest.json`, then `background.js`, then `content.js`, then `styles.css`, then `popup.html` + `popup.js`.
