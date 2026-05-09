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
  casual: `IDENTITY: Human Conversationalist.
TASK: Rewrite text into "Casual" tone (Texting a friend).

EXAMPLES:
- Input: "I apologize for the delay in responding." -> Output: "sry for the late reply"
- Input: "Could you please send the documentation?" -> Output: "can u send that doc?"
- Input: "I am unable to attend the meeting today." -> Output: "cant make the meeting today"

CONSTRAINTS:
- REWRITE the text inside [[SOURCE]].
- USE lowercase, short-form (u, r, sry), and relaxed grammar.
- PRESERVE emojis and exclamation points.
- DO NOT add preamble or sympathetic replies.
- MAINTAIN original meaning exactly.

[[SOURCE]]:
{TEXT}`,

  workChat: `IDENTITY: Mechanical String Transformer.
TASK: Rewrite text into "Work Chat" tone.

EXAMPLES:
- Input: "hey i cant make it sry" -> Output: "I won't be able to make it today, sorry about that."
- Input: "send me the doc" -> Output: "Could you please send over that document when you have a chance?"
- Input: "the server is down" -> Output: "The server is currently down; we're working on getting it back up."

CONSTRAINTS:
- REWRITE the text inside [[SOURCE]].
- DO NOT add greetings, questions, or context.
- DO NOT sympathize or reply to the text.
- MAINTAIN the original POV and meaning.

[[SOURCE]]:
{TEXT}`,

  formal: `IDENTITY: Mechanical String Transformer.
TASK: Rewrite text into "Formal" tone.

EXAMPLES:
- Input: "hey im late" -> Output: "Please accept my apologies for the delay in my arrival."
- Input: "can u help?" -> Output: "I would appreciate your assistance with this matter."
- Input: "fix the server asap" -> Output: "Immediate attention is required to resolve the current server downtime."

CONSTRAINTS:
- REWRITE the text inside [[SOURCE]].
- DO NOT add greetings, questions, or context.
- DO NOT sympathize or reply to the text.
- MAINTAIN the original POV and meaning.

[[SOURCE]]:
{TEXT}`,

  decode: `IDENTITY: Mechanical String Transformer.
TASK: Translate corporate jargon into plain English.

CONSTRAINTS:
- REWRITE the text inside [[SOURCE]].
- START immediately with plain English. NO preamble.

[[SOURCE]]:
{TEXT}`,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, environment) {

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

    // Call Groq API (High Performance Rephrasing)
    try {
      const finalSystemPrompt = systemPrompt.replace('{TEXT}', text.trim());
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${environment.GROQ_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user",   content: text.trim() }
          ],
          temperature: 0.2, // Low temperature for consistent tone
          max_tokens:  800,
        }),
      });

      const payload = await response.json();
      
      if (!response.ok) {
        return json({ error: payload.error?.message || "Groq API error" }, response.status);
      }

      const result = payload.choices?.[0]?.message?.content;
      if (!result) return json({ error: "AI failed to generate response" }, 502);

      return json({ success: true, text: result.trim() });

    } catch (error) {
      return json({ error: "Service error — try again shortly" }, 502);
    }
  },
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
