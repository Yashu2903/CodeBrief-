// Background service worker for Chrome Extension
// Runs in the background and handles extension lifecycle events

// Installation event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Set default storage values
  chrome.storage.sync.set({
    enabled: true
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    // Handle data retrieval
    chrome.storage.sync.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled });
    });
    return true; // Required for async response
  }
});

// Handle extension icon click (if no popup is set)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

