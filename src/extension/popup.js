/* popup.js — Tonal v2.1.0 */

document.addEventListener('DOMContentLoaded', () => {
  const toneItems = document.querySelectorAll('.seg-item');
  const saveBtn = document.getElementById('save-btn');

  const defaultSettings = { defaultTone: 'workChat' };

  // Load saved settings
  chrome.storage.sync.get(defaultSettings, (settings) => {
    updateDisplay(settings.defaultTone);
  });

  // Update UI
  function updateDisplay(activeTone) {
    toneItems.forEach(i => {
      i.classList.toggle('seg-item--active', i.dataset.tone === activeTone);
    });
  }

  // Tone Selection
  toneItems.forEach(item => {
    item.onclick = () => {
      const activeTone = item.dataset.tone;
      updateDisplay(activeTone);
      saveBtn.dataset.pendingTone = activeTone;
    };
  });

  // Save Logic
  saveBtn.onclick = () => {
    const toneToSave = saveBtn.dataset.pendingTone || 'workChat';
    
    chrome.storage.sync.set({ defaultTone: toneToSave }, () => {
      // Visual Feedback
      const originalText = saveBtn.textContent;
      saveBtn.textContent = "Saved!";
      saveBtn.style.background = "#34C759"; // Literal Green
      saveBtn.style.color = "#FFFFFF";
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = "";
        saveBtn.style.color = "";
      }, 1500);
    });
  };
});
