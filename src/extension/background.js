// background.js — Elite Tonal API Gateway v4.9.0
// Principles: Resilience, Observability, Structured Security

const WORKER_URL = "https://tonal-proxy.kwakhare5.workers.dev";
const CONFIG = {
  TIMEOUT: 15000,
  MAX_RETRIES: 2,
  RATE_LIMIT: 30, // reqs per minute
};

// Internal State
let stats = { requests: 0, failures: 0, lastReset: Date.now() };
let circuitOpen = false;

// Restore state when Service Worker wakes up
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
  chrome.storage.session.get(['stats', 'circuitOpen'], (data) => {
    if (data.stats) stats = data.stats;
    if (data.circuitOpen !== undefined) circuitOpen = data.circuitOpen;
  });
}

// Helper to save state
function saveState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
    chrome.storage.session.set({ stats, circuitOpen });
  }
}

/**
 * Gatekeeper: Validates and Routes AI Requests
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "TONESHIFT_CONVERT" && request.type !== "TONESHIFT_DECODE") return;

  // 1. Rate Limiting Check
  if (isRateLimited()) {
    sendResponse({ success: false, error: "RATE_LIMIT_EXCEEDED" });
    return true;
  }

  // 2. Circuit Breaker Check
  if (circuitOpen) {
    sendResponse({ success: false, error: "SERVICE_UNAVAILABLE" });
    return true;
  }

  handleAITask(request, sendResponse);
  return true; // Async channel
});

async function handleAITask(request, sendResponse) {
  const mode = request.type === "TONESHIFT_DECODE" ? "decode" : "convert";
  const payload = {
    text: sanitizeInput(request.text),
    toneLevel: request.toneLevel || "workChat",
    mode: mode,
    timestamp: Date.now()
  };

  try {
    const response = await fetchWithRetry(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP_ERROR_${response.status}`);

    const data = await response.json();
    
    if (data.success && data.text) {
      stats.failures = 0; // Reset failure count on success
      saveState();
      sendResponse({ success: true, text: data.text, confidence: data.confidence || 1.0 });
    } else {
      throw new Error(data.error || "AI_SERVICE_EMPTY_RESPONSE");
    }

  } catch (error) {
    recordFailure();
    console.error('❌ [GATEWAY] Task Failed:', error.message);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Resilience: Fetch with Exponential Backoff
 */
async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    if (retries > 0 && err.name !== 'AbortError') {
      await new Promise(r => setTimeout(r, 1000 * (CONFIG.MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

/**
 * Security: Input Sanitization
 */
function sanitizeInput(text) {
  if (!text) return "";
  return text.substring(0, 5000).replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
}

/**
 * Traffic Control: Rate Limiter logic
 */
function isRateLimited() {
  const now = Date.now();
  if (now - stats.lastReset > 60000) {
    stats.requests = 0;
    stats.lastReset = now;
  }
  stats.requests++;
  saveState();
  return stats.requests > CONFIG.RATE_LIMIT;
}

/**
 * Health Check: Circuit Breaker logic
 */
function recordFailure() {
  stats.failures++;
  saveState();
  if (stats.failures > 5) {
    circuitOpen = true;
    saveState();
    setTimeout(() => {
      circuitOpen = false;
      stats.failures = 0;
      saveState();
    }, 30000); // Wait 30s before trying again
  }
}
