# IMPLEMENTATION.md — Tonal Build Plan
## Step-by-step guide for building the extension in Antigravity IDE

---

## Build Order — Do This Exactly

Build files in this order. Each one depends on the previous.

```
1. manifest.json        ← Foundation, defines everything
2. background.js        ← Brain, handles Gemini API
3. content.js           ← Eyes & hands, injects into websites
4. styles.css           ← Look & feel of injected UI
5. popup.html           ← Settings screen
6. popup.js             ← Settings logic
7. icons/               ← Simple icon files
8. Test everything
```

---

## Phase 1: manifest.json

**Tell Antigravity:** "Create manifest.json for a Chrome extension called Tonal. It needs storage and activeTab permissions. Host permissions for Gmail, Slack, LinkedIn, WhatsApp Web, and the Gemini API. Content script runs content.js and styles.css on those 4 sites. Background service worker is background.js. Popup is popup.html. Manifest version 3."

**What it should look like when done:**
- `manifest_version: 3`
- All 4 sites + Gemini in `host_permissions`
- Content scripts with `run_at: "document_idle"`
- Background service worker declared

---

## Phase 2: background.js

**Tell Antigravity:** "Create background.js as a Chrome MV3 service worker. It listens for messages from content scripts. When it receives `{type: 'TONAL_CONVERT', text, mode, toneLevel, apiKey}` it calls the Gemini 2.0 Flash API and returns the result. When it receives `{type: 'TONAL_DECODE', text, apiKey}` it calls Gemini to decode formal text into plain English. Use the system prompts from CLAUDE.md. Handle errors for invalid key (401), rate limit (429), and network failures. Return `{success: true, text}` or `{success: false, error}`."

### The 4 prompts it needs to know:
(Copy from CLAUDE.md — the Texting, Work Chat, Corporate, and Decode prompts)

### Gemini API endpoint to use:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=API_KEY
```

### Message format for Gemini:
```json
{
  "contents": [{"parts": [{"text": "SYSTEM_PROMPT\n\nUser message: MESSAGE_HERE"}]}],
  "generationConfig": {"maxOutputTokens": 500, "temperature": 0.4}
}
```

### Response extraction:
```javascript
data.candidates[0].content.parts[0].text.trim()
```

---

## Phase 3: content.js

This is the biggest file. Build it in 3 sub-phases.

### Phase 3A: Input Detection & Button Injection

**Tell Antigravity:** "In content.js, write a function that uses MutationObserver to watch for text input areas appearing on the page. It should look for contenteditable divs matching these selectors: Gmail compose, Slack message input, LinkedIn message box, WhatsApp Web input (see CLAUDE.md for selectors). When it finds one that hasn't been processed yet (use a WeakSet to track), call an injectSendButton() function. The observer should run on document.body with childList and subtree true. Initialize with a 1.5 second delay after page load (SPAs need time)."

### Phase 3B: The Send Button

**Tell Antigravity:** "Write the injectSendButton(inputElement) function. It should:
1. Create a wrapper div with class 'ts-send-wrapper'
2. Inside it, a button with class 'ts-btn' showing '⚡ Work Chat' (default tone)
3. The button has two click areas: clicking '⚡' or the text runs conversion, clicking the tone name cycles through Texting/Work Chat/Corporate
4. On conversion click: read innerText from the input, send to background.js via chrome.runtime.sendMessage with type TONAL_CONVERT, show loading state, on response replace input text and show Undo button
5. Undo button restores the saved originalText
6. To replace text in contenteditable: focus it, select all with document.execCommand('selectAll'), then document.execCommand('insertText', false, newText), then dispatch input event
7. Append the wrapper to the input's parent or toolbar area
8. Current tone level stored in button.dataset.tone"

### Phase 3C: The Decode Button (for received messages)

**Tell Antigravity:** "Add a text selection listener to document. On 'mouseup' and 'keyup', check if window.getSelection() has text of 20+ characters. If yes, and the selection is NOT inside a contenteditable (don't show decode button inside inputs), show a small floating 'Decode ↓' button near the selection. Position it at the end of the selection using getBoundingClientRect(). On click, send the selected text to background.js with type TONAL_DECODE. Show a result card (class ts-decode-card) near the selection with the decoded text and a Copy button. Dismiss the card on click outside or Escape key. Remove the floating button when selection is cleared."

---

## Phase 4: styles.css

**Tell Antigravity:** "Create styles.css with styles for the Tonal Chrome extension injected UI. Dark purple brand color #6b21ff. Needs styles for:
- `.ts-send-wrapper` — flex container, inline, positioned near text inputs
- `.ts-btn` — pill button, purple border, light purple background, 28px tall, small font
- `.ts-btn:hover` — slight lift effect
- `.ts-btn.loading` — opacity reduced, spinning icon animation
- `.ts-btn.done` — green tones for success state
- `.ts-decode-float` — small floating button, fixed position, dark bg, white text
- `.ts-decode-card` — card popup, dark bg (#1a1a2e), white text, rounded corners, shadow, max-width 320px, z-index 999999
- `.ts-decode-card .copy-btn` — small copy button inside card
- `#ts-toast` — fixed bottom center, dark bg, colored text, smooth slide animation
- Keyframe animation for spinner"

---

## Phase 5: popup.html + popup.js

**Tell Antigravity:** "Create popup.html (320px wide) with:
- Dark theme (#0d0d1a background)
- Tonal ⚡ header with tagline 'Two-way tone translator'
- Green 'Connected' badge (hidden by default, shown when API key is saved)  
- Password input for Gemini API key with link to aistudio.google.com
- Dropdown for default tone level (Texting / Work Chat / Corporate)
- Save button
- Status message area
- Note saying 'Your key is stored locally. Never leaves your browser.'
- Footer with 'Free via Gemini API — ~1500 uses/day'"

**Tell Antigravity:** "Create popup.js that:
- On load, reads apiKey and defaultTone from chrome.storage.sync and fills the form
- Shows green Connected badge if apiKey exists
- On Save click, validates key starts with 'AIza', saves to chrome.storage.sync, shows success
- Shows error if key format is wrong"

---

## Phase 6: Icons

**Tell Antigravity:** "Create a Python script that generates icon16.png, icon48.png, and icon128.png in the icons/ folder. Each should be a purple circle (#6b21ff) with a white lightning bolt ⚡ centered. Use PIL/Pillow."

Run the script in the Antigravity terminal: `python3 generate_icons.py`

---

## Phase 7: Test It

### Load the extension in Chrome:
1. Open Chrome → go to `chrome://extensions`
2. Toggle "Developer mode" ON (top right)
3. Click "Load unpacked"
4. Select your `tonal` folder
5. Extension should appear with ⚡ icon

### Fix common errors:
| Error in chrome://extensions | Fix |
|---|---|
| "Service worker registration failed" | Check background.js for syntax errors |
| "Could not load manifest" | Check manifest.json — missing comma, wrong key name |
| "Cannot read properties of undefined" | API response structure wrong, add console.log to check |
| Button not appearing | Check content script selectors, open DevTools on Gmail |
| CORS error | Move fetch call to background.js, not content.js |

### Debug tips:
- For `content.js` errors: Right-click page → Inspect → Console
- For `background.js` errors: chrome://extensions → click "Service Worker" link → Console
- For `popup.js` errors: Right-click extension popup → Inspect

---

## Prompts to Use in Antigravity

Copy-paste these directly into Antigravity's chat:

**To start the whole project:**
```
Read the CLAUDE.md file in this project. Then build the complete Tonal Chrome extension 
following the file structure and specifications in that file. Start with manifest.json, 
then background.js, then content.js, then styles.css, then popup.html and popup.js.
Use Plan mode first to show me the full plan before writing any code.
```

**If a file needs fixing:**
```
The content.js button injection isn't working on Gmail. Open the file and fix the 
selector for Gmail's compose box. The correct selector is: div[aria-label="Message Body"]
or .Am.Al.editable. Use Fast mode.
```

**If Gemini API call is failing:**
```
The background.js Gemini API call is returning an error. Check the request format —
the endpoint is https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
and the key goes as a query parameter ?key=API_KEY, not in headers. Fix the fetch call.
```

---

## Full Testing Script (do this before calling it done)

Open each site, paste this formal text in the message box, click Tonal:

**Test input (formal → Work Chat):**
> "I wanted to follow up on our previous conversation and circle back regarding the status of the aforementioned deliverables. Could you please advise on the current timeline moving forward?"

**Expected output (Work Chat):**
> "hey just checking in — any update on those deliverables? when do you think they'll be done?"

**Test decode (select this text on any page):**
> "Please be advised that the aforementioned policy changes will be implemented effective immediately and all stakeholders are expected to ensure full compliance moving forward."

**Expected decode:**
> "The new policy starts now. Everyone needs to follow it."

---

## What To Say If Something Breaks

**Antigravity got confused / wrong code:**
```
Stop. Read CLAUDE.md again. The issue is [describe it]. 
Fix only [specific file], don't touch anything else.
```

**Service worker not loading:**
```
Check background.js for any code that uses DOM APIs (document, window, localStorage).
These don't exist in service workers. Move any such code to content.js.
```

**Buttons appearing in wrong places:**
```
The button is appearing in the wrong spot on [Gmail/Slack/LinkedIn]. 
Check the findInsertionPoint() function in content.js. 
For Gmail, the toolbar div is: .T-I.J-J5-Ji (the formatting toolbar).
For Slack, look for [data-qa="texty_tab_formatting_button"] parent.
```

---

## Estimated Build Time

| With Antigravity (Gemini 3.1 Pro doing the heavy lifting) | ~2-3 hours |
| Manual coding from scratch | 2-3 days |
| Debugging & testing | 1-2 hours extra |

You can realistically go from zero to working extension in one afternoon session using Antigravity in Plan mode with CLAUDE.md loaded.

---

## After It Works — What Next

1. **Record a demo video** — show the before/after in Gmail or Slack
2. **Post on Twitter/X** — "built this in 3 hours using Antigravity + Gemini free tier, 0 rupees spent"
3. **Share the Chrome extension link** — upload to Chrome Web Store (one-time $5 developer fee — unavoidable)
4. **Collect feedback** — what tone levels do people actually use? What sites do they want next?
5. **Add Teams and Outlook** — that's where the enterprise money is
