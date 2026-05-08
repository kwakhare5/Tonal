// background.js — Tonal
// Calls the Cloudflare Worker proxy instead of Gemini directly.
// No API key in this file. No API key in the extension at all.

// ─── PASTE YOUR CLOUDFLARE WORKER URL HERE ───────────────────
// After deploying worker.js to Cloudflare, replace the URL below.
// It will look like: https://tonal.yourname.workers.dev
const WORKER_URL = "https://tonal-proxy.kwakhare5.workers.dev";
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "TONESHIFT_CONVERT" && request.type !== "TONESHIFT_DECODE") {
    return;
  }

  const payload = {
    text:      request.text,
    toneLevel: request.toneLevel || "workChat",
    mode:      request.type === "TONESHIFT_DECODE" ? "decode" : "convert",
  };

  fetch(WORKER_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })
    .then(async res => {
      if (!res.ok) {
        if (res.status === 400) throw new Error("NO_TEXT");
        if (res.status === 429) throw new Error("RATE_LIMIT");
        if (res.status === 502 || res.status === 503) throw new Error("AI_BUSY");
        throw new Error("SERVER_ERROR");
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        sendResponse({ success: true,  text: data.text });
      } else {
        sendResponse({ success: false, error: data.error === "No text provided" ? "NO_TEXT" : "AI_FAILED" });
      }
    })
    .catch(err => {
      console.error("Tonal Fetch Error:", err);
      const msg = err.message === "Failed to fetch" ? "NETWORK_ERROR" : (err.message || "SERVER_ERROR");
      sendResponse({ success: false, error: msg });
    });

  return true; // keeps the async channel open — DO NOT REMOVE
});
