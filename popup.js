// Popup script - handles UI interactions and GitHub repository fetching

document.addEventListener('DOMContentLoaded', () => {
  const repoUrlInput = document.getElementById('repoUrl');
  const githubTokenInput = document.getElementById('githubToken');
  const fetchButton = document.getElementById('fetchButton');
  const statusText = document.getElementById('statusText');
  const statusSection = document.getElementById('statusSection');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const resultsSection = document.getElementById('resultsSection');
  const fileList = document.getElementById('fileList');

  // Load saved token and detected repository if exists
  chrome.storage.local.get(['githubToken', 'detectedRepository'], (result) => {
    if (result.githubToken) {
      githubTokenInput.value = result.githubToken;
    }
    
    // Pre-fill repository URL if detected from current page
    if (result.detectedRepository && result.detectedRepository.url) {
      repoUrlInput.value = result.detectedRepository.url;
      showStatus(`Detected repository: ${result.detectedRepository.owner}/${result.detectedRepository.repo}`, 'info');
    }
    
    // Clear detected repository after using it
    if (result.detectedRepository) {
      chrome.storage.local.remove(['detectedRepository']);
    }
  });

  // Try to get repository from current tab if on GitHub
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('github.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentRepository' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be ready
          return;
        }
        if (response && response.success && response.repository) {
          repoUrlInput.value = response.repository.url;
          showStatus(`Auto-filled from current page: ${response.repository.owner}/${response.repository.repo}`, 'info');
        }
      });
    }
  });

  // Save token when changed
  githubTokenInput.addEventListener('blur', () => {
    if (githubTokenInput.value) {
      chrome.storage.local.set({ githubToken: githubTokenInput.value });
    }
  });

  // Handle fetch button click
  fetchButton.addEventListener('click', async () => {
    const repoUrl = repoUrlInput.value.trim();
    const token = githubTokenInput.value.trim() || null;

    if (!repoUrl) {
      showStatus('Please enter a GitHub repository URL', 'error');
      return;
    }

    // Validate URL format
    try {
      parseGitHubUrl(repoUrl);
    } catch (error) {
      showStatus(error.message, 'error');
      return;
    }

    // Disable button and show loading state
    fetchButton.disabled = true;
    fetchButton.textContent = 'Fetching...';
    statusSection.classList.remove('hidden');
    progressBar.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    fileList.innerHTML = '';

    let fetchedFiles = [];
    let totalFiles = 0;

    try {
      // Fetch repository files with progress callback
      const result = await fetchRepositoryFiles(repoUrl, (progress) => {
        if (progress.type === 'start') {
          showStatus(`Starting to fetch files from ${progress.owner}/${progress.repo}...`, 'info');
        } else if (progress.type === 'fetching') {
          showStatus(`Fetching: ${progress.path}...`, 'info');
        } else if (progress.type === 'complete') {
          totalFiles = progress.fileCount;
          showStatus(`Successfully fetched ${progress.fileCount} files!`, 'success');
        } else if (progress.type === 'error') {
          showStatus(`Error: ${progress.error}`, 'error');
          progressBar.classList.add('hidden');
        }
      }, token);

      // Hide progress bar and display results
      progressBar.classList.add('hidden');
      displayResults(result);

      // Store files for later use (for LLM processing)
      chrome.storage.local.set({ 
        repositoryFiles: result.files,
        repositoryInfo: {
          owner: result.owner,
          repo: result.repo,
          url: repoUrl
        }
      }, () => {
        console.log('Repository files stored:', result.totalFiles);
      });

    } catch (error) {
      console.error('Error fetching repository:', error);
      showStatus(`Error: ${error.message}`, 'error');
      progressBar.classList.add('hidden');
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = 'Fetch Repository Files';
    }
  });

  function showStatus(message, type = 'info') {
    statusText.textContent = message;
    statusSection.classList.remove('hidden');
    
    // Update status text color based on type
    statusText.className = `status-${type}`;
  }

  function displayResults(result) {
    resultsSection.classList.remove('hidden');
    
    if (result.files.length === 0) {
      fileList.innerHTML = '<p class="file-item">No code files found in repository</p>';
      return;
    }

    // Display list of fetched files
    fileList.innerHTML = result.files
      .slice(0, 50) // Show first 50 files
      .map(file => `<div class="file-item">${file.path} (${(file.size / 1024).toFixed(1)} KB)</div>`)
      .join('');

    if (result.files.length > 50) {
      fileList.innerHTML += `<div class="file-item">... and ${result.files.length - 50} more files</div>`;
    }

    // Add summary
    const totalSize = result.files.reduce((sum, file) => sum + (file.size || 0), 0);
    fileList.innerHTML = `<div class="file-item" style="font-weight: 600; background-color: #e8f4f8;">
      Total: ${result.files.length} files (${(totalSize / 1024).toFixed(1)} KB)
    </div>` + fileList.innerHTML;
  }
});

