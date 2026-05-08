const DEFAULT_API_KEY = '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const PROMPTS = {
  'Texting': `You are a tone converter. Rewrite the message below to sound like a casual text between friends.
Use lowercase freely, be short, contractions are fine, skip unnecessary punctuation.
Do not change the core meaning. Output ONLY the rewritten message, nothing else.`,
  
  'Work Chat': `You are a tone converter. Rewrite the message below to sound like a normal professional 
talking to a colleague they're comfortable with. Friendly but clear. Not stiff, not too casual.
Do not use corporate jargon. Output ONLY the rewritten message, nothing else.`,
  
  'Corporate': `You are a tone converter. Rewrite the message below in a formal, professional tone 
suitable for emailing a manager, client, or HR. Complete sentences, proper punctuation,
polite and clear. No slang. Output ONLY the rewritten message, nothing else.`,
  
  'DECODE': `You are a decoder. The user received this formal/corporate message and wants to understand 
what it actually means in simple plain English. 
Give a 1-3 sentence plain English summary of what this message is asking or saying.
Be direct. Use everyday language. Start directly with the meaning, no preamble.
Output ONLY the plain English explanation.`
};

function buildSystemPrompt(mode, toneLevel) {
  if (mode === 'DECODE') {
    return PROMPTS['DECODE'];
  }
  return PROMPTS[toneLevel] || PROMPTS['Work Chat'];
}

async function callGemini(text, mode, toneLevel, apiKey) {
  const systemPrompt = buildSystemPrompt(mode, toneLevel);
  
  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nMessage:\n${text}` }]
        }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.4
        }
      })
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'API key not working. Check it in the popup ↗' };
    }
    if (response.status === 429) {
      return { success: false, error: 'Too many requests. Wait a moment and try again.' };
    }
    if (!response.ok) {
      return { success: false, error: 'Connection issue. Check your internet.' };
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text.trim();
    return { success: true, text: resultText };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { success: false, error: 'Connection issue. Check your internet.' };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const apiKeyToUse = request.apiKey || DEFAULT_API_KEY;
  
  if (request.type === 'TONAL_CONVERT') {
    callGemini(request.text, 'CONVERT', request.toneLevel || 'Work Chat', apiKeyToUse)
      .then(result => sendResponse(result));
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'TONAL_DECODE') {
    callGemini(request.text, 'DECODE', null, apiKeyToUse)
      .then(result => sendResponse(result));
    return true; // Keep message channel open for async response
  }
});
