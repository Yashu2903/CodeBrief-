// Content script - runs in the context of web pages
// Handles GitHub repository detection and UI injection

console.log('CodeBrief Extension content script loaded');

// Detect if we're on a GitHub page
const isGitHubPage = window.location.hostname === 'github.com' || 
                     window.location.hostname === 'www.github.com';

let currentRepositoryInfo = null;

// Initialize when page loads
if (isGitHubPage) {
  initializeGitHubIntegration();
}

// Re-initialize on navigation (GitHub uses client-side routing)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (isGitHubPage) {
      setTimeout(initializeGitHubIntegration, 500);
    }
  }
}).observe(document, { subtree: true, childList: true });

/**
 * Initialize GitHub repository detection and UI
 */
function initializeGitHubIntegration() {
  // Extract repository information from the page
  const repoInfo = extractRepositoryInfo();
  
  if (repoInfo.isRepository) {
    currentRepositoryInfo = repoInfo;
    console.log('GitHub repository detected:', repoInfo);
    
    // Optionally inject UI indicator
    // injectRepositoryBadge(repoInfo);
  }
}

/**
 * Extract repository information from GitHub page
 */
function extractRepositoryInfo() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  
  // Match GitHub repository URL pattern: github.com/owner/repo
  const repoMatch = pathname.match(/^\/([^\/]+)\/([^\/]+)(?:\/.*)?$/);
  
  if (!repoMatch) {
    return { isRepository: false };
  }
  
  const owner = repoMatch[1];
  const repo = repoMatch[2];
  
  // Skip if it's a special GitHub page (settings, new, etc.)
  const skipPages = ['settings', 'new', 'organizations', 'login', 'signup', 'explore', 'topics'];
  if (skipPages.includes(owner) || skipPages.includes(repo)) {
    return { isRepository: false };
  }
  
  const repoUrl = `https://github.com/${owner}/${repo}`;
  
  // Try to get repository description and language info from the page
  let description = '';
  let language = '';
  
  try {
    // GitHub repository description selector
    const descElement = document.querySelector('meta[name="description"]');
    if (descElement) {
      description = descElement.getAttribute('content') || '';
    }
    
    // Get primary language (if available on page)
    const languageElement = document.querySelector('[itemprop="programmingLanguage"]');
    if (languageElement) {
      language = languageElement.textContent.trim();
    }
  } catch (e) {
    console.warn('Could not extract additional repository info:', e);
  }
  
  return {
    isRepository: true,
    owner,
    repo,
    url: repoUrl,
    fullUrl: url,
    description,
    language
  };
}

/**
 * Inject a visual badge/indicator on GitHub repository pages
 * (Optional - can be enabled if desired)
 */
function injectRepositoryBadge(repoInfo) {
  // Remove existing badge if present
  const existingBadge = document.getElementById('codebrief-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  // Create badge element
  const badge = document.createElement('div');
  badge.id = 'codebrief-badge';
  badge.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <span>📋 CodeBrief Ready</span>
    </div>
  `;
  
  badge.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'openPopupWithRepo',
      repoInfo: repoInfo
    });
  });
  
  document.body.appendChild(badge);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (badge && badge.parentNode) {
      badge.style.opacity = '0';
      badge.style.transition = 'opacity 0.3s';
      setTimeout(() => badge.remove(), 300);
    }
  }, 5000);
}

/**
 * Get current repository information
 */
function getCurrentRepositoryInfo() {
  if (isGitHubPage) {
    const repoInfo = extractRepositoryInfo();
    return repoInfo.isRepository ? repoInfo : null;
  }
  return null;
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);

  // Get current repository information
  if (request.action === 'getCurrentRepository') {
    const repoInfo = getCurrentRepositoryInfo();
    sendResponse({ 
      success: true, 
      repository: repoInfo 
    });
    return true;
  }

  // Get current page URL
  if (request.action === 'getCurrentUrl') {
    sendResponse({ 
      success: true, 
      url: window.location.href,
      isGitHub: isGitHubPage
    });
    return true;
  }

  // Inject repository badge
  if (request.action === 'showBadge') {
    if (isGitHubPage) {
      const repoInfo = getCurrentRepositoryInfo();
      if (repoInfo) {
        injectRepositoryBadge(repoInfo);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Not a repository page' });
      }
    } else {
      sendResponse({ success: false, error: 'Not a GitHub page' });
    }
    return true;
  }

  // Generic action handler (for backwards compatibility)
  if (request.action === 'doSomething') {
    console.log('Received doSomething action from popup');
    
    if (isGitHubPage) {
      const repoInfo = getCurrentRepositoryInfo();
      if (repoInfo) {
        sendResponse({ 
          success: true, 
          message: 'GitHub repository detected',
          repository: repoInfo
        });
      } else {
        sendResponse({ 
          success: true, 
          message: 'On GitHub but not a repository page'
        });
      }
    } else {
      sendResponse({ 
        success: true, 
        message: 'Not on GitHub page'
      });
    }
    return true;
  }

  // Handle page modification requests
  if (request.action === 'highlightCode') {
    // Future: highlight code sections on the page
    sendResponse({ success: true });
    return true;
  }
});

// Send repository info to background when detected
if (isGitHubPage) {
  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const repoInfo = getCurrentRepositoryInfo();
        if (repoInfo) {
          chrome.runtime.sendMessage({
            action: 'repositoryDetected',
            repository: repoInfo
          });
        }
      }, 1000);
    });
  } else {
    setTimeout(() => {
      const repoInfo = getCurrentRepositoryInfo();
      if (repoInfo) {
        chrome.runtime.sendMessage({
          action: 'repositoryDetected',
          repository: repoInfo
        });
      }
    }, 1000);
  }
}

// Export functions for potential use
window.CodeBriefContent = {
  getCurrentRepositoryInfo,
  extractRepositoryInfo,
  isGitHubPage
};

