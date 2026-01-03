# Chrome Extension Integration Guide

This document explains how to modify your Chrome extension to call the secure backend proxy instead of calling Hugging Face directly.

## Why Use the Backend Proxy?

**Security**: The Hugging Face API token must never be exposed in client-side code. If you include the token in your extension:
- Users can extract it from the extension's source code
- The token appears in network requests visible in browser DevTools
- Anyone can use your token, leading to unauthorized usage and costs

The backend proxy keeps the token secure on the server side.

## Backend Configuration

1. Deploy the backend to a public URL (e.g., `https://your-backend.com`)
2. Set the `HF_API_KEY` environment variable on your server
3. Note the backend URL for use in the extension

## Extension Modifications

### Step 1: Update `llm-api.js`

Replace the `callHuggingFace` function to call your backend instead:

**Before (calling Hugging Face directly):**
```javascript
async function callHuggingFace(apiKey, prompt, options = {}) {
  const url = 'https://router.huggingface.co/v1/chat/completions';
  // ... uses apiKey in headers
}
```

**After (calling backend proxy):**
```javascript
async function callHuggingFace(apiKey, prompt, options = {}) {
  // Backend URL - update this to your deployed backend
  const BACKEND_URL = 'https://your-backend.com'; // or 'http://localhost:8000' for development
  
  // Note: apiKey parameter is no longer needed, but kept for compatibility
  // The backend handles authentication internally
  
  try {
    const response = await fetch(`${BACKEND_URL}/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repoInfo: options.repoInfo || { owner: '', repo: '', url: '' },
        formattedPrompt: prompt
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || errorData.detail || errorData.error || 'Unknown error';
      
      // Handle specific status codes
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      if (response.status === 504) {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Return in the same format as before for compatibility
    return {
      content: data.resumePoints,
      usage: {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null
      }
    };
  } catch (error) {
    console.error('Backend API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Backend API error: ${String(error)}`);
  }
}
```

### Step 2: Update `generateResumePoints` function

Modify the function to pass `repoInfo` to `callHuggingFace`:

```javascript
async function generateResumePoints(provider, apiKey, repoInfo, files, onProgress = null, options = {}) {
  // ... existing file preparation code ...
  
  // Call backend proxy (apiKey is no longer needed but kept for compatibility)
  const apiOptions = {
    ...options,
    repoInfo: repoInfo,  // Pass repoInfo to the backend
    maxGenerationTokens: options.maxGenerationTokens || options.maxTokens || 2000
  };
  const apiResult = await callHuggingFace(apiKey, prompt, apiOptions);
  
  // ... rest of the function remains the same ...
}
```

### Step 3: Update `popup.js`

Remove the API key input requirement since the backend handles authentication:

**Option A: Keep the UI but make it optional (for backward compatibility)**
```javascript
// In the generate button click handler:
generateButton.addEventListener('click', async () => {
  // API key is no longer required - backend handles authentication
  // But we can keep the input for backward compatibility or remove it
  
  // Get repository files and info
  chrome.storage.local.get(['repositoryFiles', 'repositoryInfo'], async (result) => {
    // ... validation code ...
    
    try {
      const llmResult = await LLMAPI.generateResumePoints(
        'huggingface', // Provider name (kept for compatibility)
        null, // API key no longer needed - pass null or empty string
        result.repositoryInfo,
        result.repositoryFiles,
        // ... progress callback and options ...
      );
      // ... rest of the code ...
    } catch (error) {
      // ... error handling ...
    }
  });
});
```

**Option B: Remove API key input entirely (recommended)**

1. Remove the API key input field from `popup.html`
2. Remove API key storage/retrieval code from `popup.js`
3. Update the generate button handler to not require an API key

### Step 4: Update `manifest.json`

Update host permissions to include your backend URL:

```json
{
  "host_permissions": [
    "https://api.github.com/*",
    "https://github.com/*",
    "https://your-backend.com/*"
  ]
}
```

For development with localhost:
```json
{
  "host_permissions": [
    "https://api.github.com/*",
    "https://github.com/*",
    "http://localhost:8000/*"
  ]
}
```

## Complete Example: Modified `callHuggingFace` Function

Here's a complete replacement for the `callHuggingFace` function in `llm-api.js`:

```javascript
/**
 * Call backend proxy to generate resume points
 * @param {string} apiKey - No longer used, kept for compatibility
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options (repoInfo, etc.)
 * @returns {Promise<Object>} Object with content and token usage
 */
async function callHuggingFace(apiKey, prompt, options = {}) {
  // Backend URL - configure this to match your deployment
  const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend.com';
  
  // Extract repoInfo from options
  const repoInfo = options.repoInfo || { owner: '', repo: '', url: '' };
  
  try {
    const response = await fetch(`${BACKEND_URL}/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repoInfo: repoInfo,
        formattedPrompt: prompt
      })
    });
    
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText;
      }
      
      // Handle specific status codes
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable. The model may be loading. Please try again in 10-20 seconds.');
      }
      if (response.status === 504) {
        throw new Error('Request timed out. Please try again.');
      }
      if (response.status === 502) {
        throw new Error('Backend service error. Please try again later.');
      }
      
      throw new Error(`Backend error (${response.status}): ${errorMessage}`);
    }
    
    const data = await response.json();
    
    // Return in the same format as before for compatibility
    return {
      content: data.resumePoints || '',
      usage: {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null
      }
    };
  } catch (error) {
    console.error('Backend API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Backend API error: ${String(error)}`);
  }
}
```

## Testing

1. **Local Testing:**
   - Start the backend: `uvicorn main:app --reload`
   - Set `BACKEND_URL = 'http://localhost:8000'` in your extension
   - Test the extension functionality

2. **Production Testing:**
   - Deploy backend to your server
   - Update `BACKEND_URL` in extension code
   - Test with real repository data

## Security Notes

- ✅ API token is never exposed to users
- ✅ All requests go through your secure backend
- ✅ Rate limiting prevents abuse
- ✅ Input validation prevents malicious requests
- ✅ No user data is persisted on the backend

## Troubleshooting

**CORS Errors:**
- Ensure backend CORS is configured correctly
- Check that your backend URL is in `manifest.json` host_permissions

**401/403 Errors:**
- Verify `HF_API_KEY` is set on the backend server
- Check backend logs for authentication errors

**Connection Errors:**
- Verify backend URL is correct and accessible
- Check network connectivity
- Ensure backend is running and healthy

**Rate Limit Errors:**
- Backend limits to 10 requests/minute per IP
- Wait before retrying
- Consider implementing per-user rate limiting if needed

