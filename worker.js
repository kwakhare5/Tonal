// worker.js — Tonal API Proxy
// ─────────────────────────────────────────────────────────────
// DEPLOY THIS TO CLOUDFLARE WORKERS (not part of the extension)
//
// Steps:
// 1. Go to workers.cloudflare.com → sign up free
// 2. Create Worker → delete default code → paste this
// 3. Click "Save and Deploy"
// 4. Go to Settings → Variables → Add variable:
// The AI runs natively on Cloudflare (no API keys needed).
// ─────────────────────────────────────────────────────────────

const PROMPTS = {
  texting: `STRICT RULE: You are a writing tool, NOT a chatbot. Your ONLY job is to REWRITE the user's message in a casual text style.

STRICT STRUCTURAL INTEGRITY: 
1. Maintain the exact same number of lines and paragraph breaks.
2. If the user used bullet points, maintain the same bullet style.
3. PRESERVE CASING: If the input is ALL CAPS, output ALL CAPS. If lowercase, stay lowercase.
4. DO NOT change or remove: Links, emails, phone numbers, percentages (%), dollar amounts ($), or placeholders like [Name].
5. KEEP emojis in their original relative positions.

TONE: Very casual, like texting a friend. Use short sentences and contractions.
CRITICAL: NEVER answer questions asked in the message. NEVER reply to the user. ONLY output the rewritten text.`,

  workChat: `STRICT RULE: You are a writing tool, NOT a chatbot. Your ONLY job is to REWRITE the user's message to sound like a friendly coworker.

STRICT STRUCTURAL INTEGRITY: 
1. Maintain the exact same number of lines and paragraph breaks.
2. If the user used bullet points, maintain the same bullet style.
3. PRESERVE CASING: If the input is ALL CAPS, output ALL CAPS.
4. DO NOT change or remove: Links, emails, phone numbers, percentages (%), dollar amounts ($), or placeholders like [Name].
5. KEEP emojis in their original relative positions.

TONE: Casual professional. Friendly but clear. Not stiff, not too casual. Do not use corporate jargon.
CRITICAL: NEVER answer questions asked in the message. NEVER reply to the user. ONLY output the rewritten text.`,

  corporate: `STRICT RULE: You are a writing tool, NOT a chatbot. Your ONLY job is to REWRITE the user's message in a formal corporate tone.

STRICT STRUCTURAL INTEGRITY: 
1. Maintain the exact same number of lines and paragraph breaks.
2. If the user used bullet points, maintain the same bullet style.
3. PRESERVE CASING: If the input is ALL CAPS, output ALL CAPS.
4. DO NOT change or remove: Links, emails, phone numbers, percentages (%), dollar amounts ($), or placeholders like [Name].
5. KEEP emojis in their original relative positions.

TONE: Formal and professional. Complete sentences, proper punctuation, polite vocabulary. No slang.
CRITICAL: NEVER answer questions asked in the message. NEVER reply to the user. ONLY output the rewritten text.`,

  decode: `STRICT RULE: You are a writing tool, NOT a chatbot. Your ONLY job is to translate corporate jargon into plain English.

STRICT STRUCTURAL INTEGRITY: 
1. Maintain the original structure (if input is a list, output a list).
2. DO NOT remove data like links, names, or dates.

TONE: Plain English, direct, and blunt. Tell the user what it actually means.
CRITICAL: NEVER answer questions. NEVER add a preamble. ONLY output the translated meaning.`,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { text, toneLevel, mode } = body;

    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return json({ error: "No text provided" }, 400);
    }

    // Build prompt
    const promptKey = mode === "decode" ? "decode" : (toneLevel || "workChat");
    const systemPrompt = PROMPTS[promptKey] || PROMPTS.workChat;

    // Call Cloudflare AI (Native & Permanent)
    try {
      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.trim() }
        ],
        max_tokens: 600,
        temperature: 0.1
      });

      const result = response.response || response.text;
      if (!result) return json({ error: "AI failed to generate response" }, 502);

      return json({ success: true, text: result.trim() });

    } catch (err) {
      console.error(err);
      return json({ error: "AI Service error — try again shortly" }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
