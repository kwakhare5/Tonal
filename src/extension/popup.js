document.addEventListener('DOMContentLoaded', () => {
  const toneItems = document.querySelectorAll('.seg-item');
  const saveBtn = document.getElementById('saveBtn');
  let selectedTone = 'workChat';

  // Load saved preference
  chrome.storage.sync.get({ defaultTone: 'workChat' }, (result) => {
    selectedTone = result.defaultTone;
    updateUI();
  });

  toneItems.forEach(item => {
    item.addEventListener('click', () => {
      selectedTone = item.dataset.tone;
      updateUI();
    });
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ defaultTone: selectedTone }, () => {
      const originalText = saveBtn.textContent;
      const originalBg = saveBtn.style.background;
      
      saveBtn.textContent = 'Saved!';
      saveBtn.style.background = '#34C759';
      saveBtn.style.pointerEvents = 'none';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = originalBg;
        saveBtn.style.pointerEvents = 'auto';
      }, 1500);
    });
  });

  function updateUI() {
    toneItems.forEach(item => {
      if (item.dataset.tone === selectedTone) {
        item.classList.add('seg-item--active');
      } else {
        item.classList.remove('seg-item--active');
      }
    });
  }
});
