# CLAUDE.md — Agent Rules + Project Context
# Auto-read by: Claude Code, Claude Sonnet, Claude Opus
# Single file. Contains always-active rules + project info.

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
|---|---|---|
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

# CLAUDE.md — Tonal Chrome Extension
## Project Context for AI Agent (Antigravity / Claude / Gemini)

---

## What Is This Project

**Tonal** is a free Chrome extension that works as a two-way tone translator inside Gmail, Slack (browser), LinkedIn, and WhatsApp Web.

It solves two problems for Gen Z users and non-native English speakers:

**Problem 1 — Sending:**
User types a casual message ("hey can u send me that doc") and needs it to sound professional before sending. One click converts it to the right tone level.

**Problem 2 — Receiving:**
User receives a long formal/corporate message and can't be bothered to parse it. They select the text and one click tells them what it actually means in plain English.

**The tone slider has 3 levels:**

- **Texting** — Very casual, like texting a friend. No overthinking.
- **Work Chat** — Casual professional. How a normal person talks to a colleague they like.
- **Corporate** — Formal, complete sentences, professional vocabulary. For boss emails, clients, HR.

---

## Tech Stack

| Layer               | Technology                                                                                 | Why                                 |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Extension framework | Chrome Extension Manifest V3                                                               | Required for Chrome                 |
| Languages           | Vanilla JavaScript, HTML, CSS                                                              | Zero dependencies, fast load        |
| AI API              | Google Gemini 2.0 Flash                                                                    | Free tier, fast, sufficient quality |
| API endpoint        | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | Free, no credit card needed         |
| Storage             | `chrome.storage.sync`                                                                      | Sync settings across devices        |
| Background worker   | Service Worker (MV3)                                                                       | Required by MV3 spec                |

**No npm. No build step. No React. No bundler.** Pure vanilla JS files the browser loads directly.

---

## File Structure

```
tonal/
├── CLAUDE.md                    ← This file (project context)
├── manifest.json                ← Extension config, permissions, file declarations
├── background.js                ← Service worker: handles Gemini API calls
├── content.js                   ← Injected into web pages: detects inputs, injects buttons
├── styles.css                   ← Styles for injected UI (button, popup, toast)
├── popup.html                   ← Extension popup (click the icon in Chrome toolbar)
├── popup.js                     ← Popup logic: save API key, settings
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## How It Works — Full Flow

### Sending Flow (Casual → Formal)

1. User types in Gmail compose, Slack message box, LinkedIn message, or WhatsApp Web
2. `content.js` detects the text input and injects a small "Tonal ⚡" button next to it
3. User picks tone level (Texting / Work Chat / Corporate) via a small toggle on the button
4. User clicks the button
5. `content.js` reads the text from the input field and sends a message to `background.js`
6. `background.js` calls the Gemini API with the text + tone instructions
7. Gemini returns the rewritten text
8. `content.js` replaces the text in the input field with the rewritten version
9. User reviews it and sends (or edits further)
10. There's an Undo button that restores the original text

### Receiving/Decoding Flow (Formal → Plain)

1. User selects any text on the page (a received email, a Slack message, anything)
2. A small floating "Decode ↓" button appears near their cursor/selection
3. User clicks it
4. `content.js` sends the selected text to `background.js`
5. Gemini returns a plain English explanation
6. A small popup/tooltip appears near the selection showing the decoded version
7. Popup has a "Copy" button and auto-dismisses after 8 seconds or when clicked away

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

| Platform     | Input selector strategy                                            |
| ------------ | ------------------------------------------------------------------ |
| Gmail        | `div[role="textbox"][aria-label*="compose"]` or `.Am.Al.editable`  |
| Slack        | `.ql-editor`, `[data-qa="message_input"]`, `[data-lexical-editor]` |
| LinkedIn     | `.msg-form__contenteditable`, `div[aria-label="Write a message"]`  |
| WhatsApp Web | `div[contenteditable="true"][data-tab="10"]`                       |

---

## The Gemini API Integration

### API Key Setup

- User gets a free API key from https://aistudio.google.com/app/apikey
- User pastes it into the extension popup
- It's stored in `chrome.storage.sync` (encrypted by Chrome, never sent anywhere except Gemini)

### API Call (in background.js)

```javascript
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(text, mode, toneLevel, apiKey) {
  const systemPrompt = buildSystemPrompt(mode, toneLevel);

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: systemPrompt }, { text: text }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.4,
      },
    }),
  });

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
```

### System Prompts

**SEND mode — Texting level:**

```
You are a tone converter. Rewrite the message below to sound like a casual text between friends.
Use lowercase freely, be short, contractions are fine, skip unnecessary punctuation.
Do not change the core meaning. Output ONLY the rewritten message, nothing else.
```

**SEND mode — Work Chat level:**

```
You are a tone converter. Rewrite the message below to sound like a normal professional
talking to a colleague they're comfortable with. Friendly but clear. Not stiff, not too casual.
Do not use corporate jargon. Output ONLY the rewritten message, nothing else.
```

**SEND mode — Corporate level:**

```
You are a tone converter. Rewrite the message below in a formal, professional tone
suitable for emailing a manager, client, or HR. Complete sentences, proper punctuation,
polite and clear. No slang. Output ONLY the rewritten message, nothing else.
```

**RECEIVE mode (decode) — always plain English:**

```
You are a decoder. The user received this formal/corporate message and wants to understand
what it actually means in simple plain English.
Give a 1-3 sentence plain English summary of what this message is asking or saying.
Be direct. Use everyday language. Start directly with the meaning, no preamble.
Output ONLY the plain English explanation.
```

---

## UI Design Requirements

### Injected Send Button (appears in text inputs)

- Small, unobtrusive pill button: "⚡ Tonal"
- Positioned: bottom-right of text input area, not blocking text
- Shows current tone level: "⚡ Texting", "⚡ Work Chat", "⚡ Corporate"
- Click the label area = run conversion
- Click the tone name = cycle through the 3 levels
- Loading state: spinner + "Converting..."
- Done state: "↩ Undo" button appears (restores original)
- Disappears cleanly if the input is removed from DOM

### Floating Decode Button (appears on text selection)

- Only appears when user selects 20+ characters of text
- Small floating button near the selection: "Decode ↓"
- On click: shows a tooltip/card with the plain English version
- Card has: decoded text + "📋 Copy" button
- Card dismisses on click-outside or pressing Escape
- Does NOT appear inside editable fields (only on read-only content)

### Toast Notifications

- Bottom center of screen
- Dark background (#1a1a2e), colored text based on type
- 3 types: success (green), error (red), info (purple)
- Auto-dismiss after 3 seconds

### Extension Popup (popup.html)

- Dark theme (#0d0d1a)
- API key input (password field)
- Default tone selector (which level to start on)
- "Connected" badge when key is saved
- Link to get free Gemini API key
- Simple, clean, 320px wide

---

## Important Technical Constraints

### MV3 Service Worker Rules

- `background.js` is a SERVICE WORKER — it cannot access the DOM
- All fetch/API calls must happen in `background.js`, NOT in `content.js`
- Use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` to communicate between content.js and background.js
- Service workers are stateless — don't store anything in memory, use `chrome.storage`

### Content Script Injection

- Use `MutationObserver` to watch for dynamically added elements (Gmail, Slack are SPAs)
- Keep a `WeakSet` of already-injected inputs to avoid duplicate buttons
- Clean up injected UI when elements are removed from DOM

### Cross-Origin Requests

- Only `background.js` (service worker) can call the Gemini API
- The host permission `https://generativelanguage.googleapis.com/*` must be in `manifest.json`
- Never put API key in content scripts (security risk)

### Text Input Handling

- Gmail, Slack, LinkedIn use `contenteditable` divs, NOT `<textarea>` or `<input>`
- To set text in contenteditable: use `document.execCommand("insertText")` after selecting all
- Always dispatch `input` and `change` events after setting text so the app's state updates
- Fallback: set `innerHTML` + dispatch events manually

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
  "content_scripts": [
    {
      "matches": [
        "https://mail.google.com/*",
        "https://app.slack.com/*",
        "https://www.linkedin.com/*",
        "https://web.whatsapp.com/*"
      ],
      "js": ["content.js"],
      "css": ["styles.css"],
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
| No API key set              | "Add your free Gemini API key in the Tonal popup ↗" |
| API key invalid (401)       | "API key not working. Check it in the popup ↗"      |
| Rate limit hit (429)        | "Too many requests. Wait a moment and try again."   |
| Input is empty              | Don't show button (or grey it out)                  |
| Input too short (<10 chars) | Toast: "Type more before converting"                |
| Network error               | "Connection issue. Check your internet."            |

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

## Testing Checklist

After building, verify each of these manually:

- [ ] Extension loads without errors in `chrome://extensions`
- [ ] Popup opens, API key saves, shows "Connected" badge
- [ ] Button appears in Gmail compose window
- [ ] Button appears in Slack message input
- [ ] Button appears in LinkedIn message input
- [ ] Button appears in WhatsApp Web input
- [ ] Clicking the tone label cycles through Texting / Work Chat / Corporate
- [ ] Conversion replaces text correctly in Gmail (contenteditable)
- [ ] Conversion replaces text correctly in Slack (Quill/Lexical editor)
- [ ] Undo button restores original text
- [ ] Selecting received text shows "Decode ↓" button
- [ ] Decode shows plain English popup
- [ ] Copy button in decode popup works
- [ ] Error toasts appear for missing API key
- [ ] Extension doesn't crash on non-supported pages
- [ ] No console errors during normal use

---

## Monetization Plan (Future)

- **Free tier**: 20 conversions/day using user's own Gemini API key (always free)
- **Pro ($3/month)**: Unlimited conversions, our managed API key, no setup needed
- **Team ($9/month per seat)**: Shared settings, custom tone presets, analytics

This CLAUDE.md should give you (the AI agent) everything needed to build the full extension without asking clarifying questions. Start with `manifest.json`, then `background.js`, then `content.js`, then `styles.css`, then `popup.html` + `popup.js`.
