document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');
  const badge = document.getElementById('connected-badge');

  // Load existing settings
  chrome.storage.sync.get(['apiKey'], (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
      badge.classList.add('visible');
      badge.textContent = 'Ready';
    } else {
      badge.classList.remove('visible');
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    statusMsg.className = '';
    statusMsg.textContent = '';
    
    if (apiKey && !apiKey.startsWith('AIza')) {
      statusMsg.textContent = 'Invalid key format. Gemini keys start with "AIza"';
      statusMsg.className = 'error-text';
      return;
    }
    
    // Disable button while saving
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    chrome.storage.sync.set({
      apiKey: apiKey
    }, () => {
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
      
      if (apiKey) {
        badge.classList.add('visible');
        badge.textContent = 'Ready';
      } else {
        badge.classList.remove('visible');
      }
      
      statusMsg.textContent = 'Settings saved successfully!';
      statusMsg.className = 'success-text';
      
      setTimeout(() => {
        statusMsg.textContent = '';
      }, 3000);
    });
  });
});
