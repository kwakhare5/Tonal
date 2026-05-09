// background.js — Tonal Proxy Client
const WORKER_URL = "https://tonal-proxy.kwakhare5.workers.dev";

/**
 * @param {Object} request
 * @param {chrome.runtime.MessageSender} sender
 * @param {function(APIResponse):void} sendResponse
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "TONESHIFT_CONVERT" && request.type !== "TONESHIFT_DECODE") return;

  const mode = request.type === "TONESHIFT_DECODE" ? "decode" : "convert";
  const payload = {
    text: request.text,
    toneLevel: request.toneLevel || "workChat",
    mode: mode
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s safety timeout

  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal
  })
  .then(async response => {
    clearTimeout(timeoutId);
    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status >= 500) throw new Error("AI_BUSY");
      throw new Error("SERVER_ERROR");
    }
    return response.json();
  })
  .then(payload => {
    if (payload.success) {
      sendResponse({ success: true, text: payload.text });
    } else {
      sendResponse({ success: false, error: payload.error || "AI_FAILED" });
    }
  })
  .catch(error => {
    clearTimeout(timeoutId);
    const errorMsg = error.name === 'AbortError' ? "AI_BUSY" : "NETWORK_ERROR";
    sendResponse({ success: false, error: errorMsg });
  });

  return true; // Keep channel open
});
