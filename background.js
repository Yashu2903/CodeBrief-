// Background service worker for Chrome Extension
// Runs in the background and handles extension lifecycle events

// Installation event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('CodeBrief Extension installed', details.reason);
  
  // Set default storage values
  chrome.storage.local.set({
    enabled: true,
    settings: {
      maxFileSize: 1024 * 1024, // 1MB default max file size
      codeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c']
    }
  });

  // Set badge text on installation
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);

  // Handle repository data retrieval
  if (request.action === 'getRepositoryData') {
    chrome.storage.local.get(['repositoryFiles', 'repositoryInfo'], (result) => {
      sendResponse({ 
        success: true,
        files: result.repositoryFiles || [],
        info: result.repositoryInfo || null,
        fileCount: result.repositoryFiles?.length || 0
      });
    });
    return true; // Required for async response
  }

  // Handle clearing repository data
  if (request.action === 'clearRepositoryData') {
    chrome.storage.local.remove(['repositoryFiles', 'repositoryInfo'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle getting storage stats
  if (request.action === 'getStorageStats') {
    chrome.storage.local.get(null, (items) => {
      const fileCount = items.repositoryFiles?.length || 0;
      const totalSize = items.repositoryFiles?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
      
      sendResponse({
        success: true,
        fileCount,
        totalSize,
        hasRepository: !!items.repositoryFiles,
        hasToken: !!items.githubToken
      });
    });
    return true;
  }

  // Handle LLM processing request (prepare for future integration)
  if (request.action === 'processWithLLM') {
    handleLLMProcessing(request)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle extension enabled/disabled state
  if (request.action === 'getData') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled !== false });
    });
    return true;
  }

  if (request.action === 'toggle') {
    chrome.storage.local.set({ enabled: request.enabled }, () => {
      sendResponse({ success: true });
      updateBadge(request.enabled);
    });
    return true;
  }

  // Handle repository detection from content script
  if (request.action === 'repositoryDetected') {
    console.log('Repository detected on page:', request.repository);
    // Store the detected repository info for quick access
    chrome.storage.local.set({ 
      detectedRepository: request.repository 
    });
    sendResponse({ success: true });
    return true;
  }

  // Handle request to open popup with repository URL pre-filled
  if (request.action === 'openPopupWithRepo') {
    // Store repository info so popup can use it
    if (request.repoInfo) {
      chrome.storage.local.set({ 
        detectedRepository: request.repoInfo 
      });
    }
    sendResponse({ success: true });
    return true;
  }
});

// Handle extension icon click (if no popup is set)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id, tab.url);
  
  // If user is on GitHub, offer to fetch current repository
  if (tab.url && tab.url.includes('github.com')) {
    const match = tab.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const repoUrl = `https://github.com/${match[1]}/${match[2]}`;
      console.log('Detected GitHub repository:', repoUrl);
      // Could open popup or send message to content script
    }
  }
});

// Update badge based on extension state
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: '✗' });
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  }
}

// Handle LLM processing (now implemented in popup.js via llm-api.js)
// This function is kept for backward compatibility but processing happens in popup
async function handleLLMProcessing(request) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['repositoryFiles', 'repositoryInfo'], async (result) => {
      if (!result.repositoryFiles || result.repositoryFiles.length === 0) {
        reject(new Error('No repository files found. Please fetch repository files first.'));
        return;
      }

      try {
        // LLM processing is now handled directly in popup.js
        // This is kept for potential background processing in the future
        resolve({
          message: 'LLM processing should be done via popup interface',
          stats: {
            totalFiles: result.repositoryFiles.length,
            repository: result.repositoryInfo
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Monitor storage changes (optional - for debugging)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.repositoryFiles) {
      const fileCount = changes.repositoryFiles.newValue?.length || 0;
      console.log(`Repository files updated: ${fileCount} files`);
      
      // Update badge with file count if reasonable
      if (fileCount > 0 && fileCount < 1000) {
        chrome.action.setBadgeText({ text: fileCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
      }
    }
  }
});

// Handle errors
chrome.runtime.onStartup.addListener(() => {
  console.log('CodeBrief Extension started');
});

// Keep service worker alive for debugging
console.log('CodeBrief Extension background service worker loaded');

