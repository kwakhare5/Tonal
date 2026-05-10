// worker.js — Tonal API Proxy
// ─────────────────────────────────────────────────────────────
// DEPLOY THIS TO CLOUDFLARE WORKERS
// ─────────────────────────────────────────────────────────────

const SYSTEM_LOGIC = `
You are the Tonal Engine. Your sole purpose is to rewrite text while preserving 100% of the meaning and facts.

CORE RULES:
1. IDENTITY & DATA LOCK: Names (e.g., "Ravi", "Sarah"), numbers, dates, times, links, email addresses, and amounts are IMMUTABLE. Never change, paraphrase, or omit them.
2. MINIMAL INTERVENTION: Only change parts of the text that require a tone shift. Keep greetings (e.g., "Hello Ravi"), sign-offs, and neutral statements exactly as they are.
3. CASING LOCK: Preserve the original casing of the input. If it is lowercase, keep it lowercase. If it is ALL CAPS, keep it ALL CAPS.
4. Correct spelling mistakes silently.
5. Do not add filler or corporate words that were not in the original.
6. Same length as the original — do not pad.`;

const PROMPTS = {
  casual: `You are a tone converter. Rewrite the message below in a casual texting style.
${SYSTEM_LOGIC}

TONE FINGERPRINT (CASUAL):
- Keep the format of the text same (Casing Lock).
- Minimal punctuation, no full stop at end.
- ONLY use contractions/abbreviations (u, ur, gonna, wanna, bc, lmk, rn) if the original text already implies a casual vibe.
- Short, sometimes incomplete sentences.
- Questions without question marks sometimes.

EXAMPLES:
INPUT: Could you please send me the Q3 report at your earliest convenience?
OUTPUT: can u send me the Q3 report

INPUT: I will be approximately 10 minutes delayed. I apologize for the inconvenience.
OUTPUT: gonna be 10 min late sry

Now rewrite this message. Output ONLY the rewritten message, nothing else.`,

  workChat: `You are a tone converter. Rewrite the message below in a Work Chat tone.
${SYSTEM_LOGIC}

TONE FINGERPRINT (WORK CHAT):
- Sentence case — capitalize first word and proper nouns.
- Contractions are fine: I'll, can't, won't, let's, I've, you're.
- Friendly but direct — no warmup fluff.
- No buzzwords: not "circle back", "synergize", "leverage", "deliverables", "bandwidth".
- Question marks always, exclamations sparingly.

EXAMPLES:
INPUT: hey cn u send me teh Q3 reprt asap
OUTPUT: Can you send me the Q3 report ASAP?

INPUT: gonna be 10 min late sry
OUTPUT: I'll be about 10 minutes late, sorry.

Now rewrite this message. Output ONLY the rewritten message, nothing else.`,

  formal: `You are a tone converter. Rewrite the message below in a formal professional tone.
${SYSTEM_LOGIC}

TONE FINGERPRINT (FORMAL):
- Full sentences, ends with period always.
- No contractions: "I will" not "I'll", "cannot" not "can't", "do not" not "don't".
- Polite structure: "Could you please", "I would appreciate", "I would like to".
- No slang or abbreviations.

EXAMPLES:
INPUT: hey cn u send me teh Q3 reprt
OUTPUT: Could you please send me the Q3 report?

INPUT: gonna be 10 min late sry
OUTPUT: I regret to inform you that I will be approximately 10 minutes delayed. I apologize for the inconvenience.

Now rewrite this message. Output ONLY the rewritten message, nothing else.`,

  decode: `You are a decoder for formal and corporate language.
Tell me in plain, simple words what this message actually means or is asking for.

Hard rules:
- Preserve ALL specific information: numbers, names, dates, amounts, deadlines. Never omit these.
- 1–2 sentences maximum.
- Use simple everyday words.
- If it is a request, say clearly what they are asking for.
- If it is bad news, say it plainly.
- Do not use formal words yourself in the explanation.

EXAMPLES:
INPUT: After due consideration, the committee has determined that the proposed budget allocation is not aligned with current organizational priorities.
OUTPUT: Your budget request was rejected.

INPUT: I am following up on my previous correspondence and would appreciate an update at your earliest convenience.
OUTPUT: They want an update — respond to their earlier message.

Now decode this message. Output ONLY the plain English explanation, nothing else.`,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, environment) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

    const { text, toneLevel, mode, platform } = body;
    if (!text || typeof text !== "string" || text.trim().length < 2) return json({ success: false, error: "Text too short" }, 400);

    const promptKey = mode === "decode" ? "decode" : (toneLevel || "workChat");
    let systemPrompt = PROMPTS[promptKey] || PROMPTS.workChat;

    // Inject Platform Context
    if (platform && mode !== "decode") {
      const contextMap = {
        slack: "PLATFORM: Slack (Internal Team Chat). Keep it brief, direct, and conversational. No email-style greetings or sign-offs unless present in original.",
        whatsapp: "PLATFORM: WhatsApp (Instant Messaging). Be concise and informal. Avoid corporate fluff.",
        gmail: "PLATFORM: Gmail (Email). Use professional sentence structure. Maintain standard email courtesy.",
        linkedin: "PLATFORM: LinkedIn (Professional Networking). Be professional and polished. Respect InMail norms."
      };
      const context = contextMap[platform] || "PLATFORM: General Web Input.";
      systemPrompt = `${systemPrompt}\n\n${context}`;
    }

    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `INPUT: ${text.trim()}` }
      ],
      temperature: 0.1, 
      max_tokens: 1000
    };

    if (environment.GROQ_API_KEY) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${environment.GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          let rawText = data.choices?.[0]?.message?.content?.trim() || "";
          
          // Smart Preamble Stripper
          const cleanText = rawText
            .replace(/^(here is|sure|certainly|revised|converted|output|rewritten|message|result|the|this)[\s\S]*?[:\n]+/i, "") // Strip headers
            .replace(/^["']|["']$/g, "") // Strip accidental quotes
            .trim();
            
          return json({ success: true, text: cleanText || rawText, provider: "groq" });
        }
      } catch (e) { console.error("Groq Failed:", e); }
    }

    return json({ success: false, error: "AI Pipeline failed" }, 502);
  },
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
