/**
 * TONAL BACKGROUND GATEWAY v5.0.0
 * AI Proxy Orchestrator | Error Resilience
 */

const CONFIG = {
  WORKER_URL: "https://tonal-proxy.kwakhare5.workers.dev"
};

/**
 * Message Router: Listens for rephrasing or decoding requests.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const isTonalRequest = ["TONESHIFT_CONVERT", "TONESHIFT_DECODE"].includes(request.type);
  if (!isTonalRequest) return;

  handleRequest(request, sendResponse);
  return true; // Keep channel open for async response
});

/**
 * Processes the AI task by calling the Cloudflare Proxy.
 */
async function handleRequest(request, sendResponse) {
  const mode = request.type === "TONESHIFT_DECODE" ? "decode" : "convert";
  
  const payload = {
    text: request.text?.substring(0, 5000), // Safety limit
    toneLevel: request.toneLevel || "workChat",
    mode: mode
  };

  try {
    const response = await fetch(CONFIG.WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Server Error: ${response.status}`);

    const data = await response.json();
    
    if (data.success && data.text) {
      sendResponse({ success: true, text: data.text });
    } else {
      throw new Error(data.error || "AI returned empty response");
    }

  } catch (err) {
    console.error('Tonal Gateway Error:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}
