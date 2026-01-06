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
  
  // LLM elements
  const llmSection = document.getElementById('llmSection');
  const generateButton = document.getElementById('generateButton');
  const jobDescriptionInput = document.getElementById('jobDescription');
  const llmStatusSection = document.getElementById('llmStatusSection');
  const llmStatusText = document.getElementById('llmStatusText');
  const resumePointsSection = document.getElementById('resumePointsSection');
  const resumePoints = document.getElementById('resumePoints');
  const resumeStats = document.getElementById('resumeStats');
  const copyButton = document.getElementById('copyButton');

  // Load saved tokens and detected repository if exists
  chrome.storage.local.get(['githubToken', 'detectedRepository', 'repositoryFiles'], (result) => {
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
    
    // If repository files exist, show LLM section
    if (result.repositoryFiles && result.repositoryFiles.length > 0) {
      llmSection.classList.remove('hidden');
      // Button is always enabled (Hugging Face is free)
      generateButton.disabled = false;
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

  // Save tokens when changed
  githubTokenInput.addEventListener('blur', () => {
    if (githubTokenInput.value) {
      chrome.storage.local.set({ githubToken: githubTokenInput.value });
    }
  });
  
  // Generate button is always enabled (Hugging Face is free)
  generateButton.disabled = false;

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
        // Show LLM section after files are fetched
        llmSection.classList.remove('hidden');
        // Button is always enabled (Hugging Face is free)
        generateButton.disabled = false;
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
  
  // Handle generate resume points button
  generateButton.addEventListener('click', async () => {
    // API key is no longer required - backend handles authentication
    // But we keep the input for backward compatibility (optional)
    
    // Get repository files and info
    chrome.storage.local.get(['repositoryFiles', 'repositoryInfo'], async (result) => {
      if (!result.repositoryFiles || result.repositoryFiles.length === 0) {
        showLLMStatus('No repository files found. Please fetch files first.', 'error');
        return;
      }
      
      if (!result.repositoryInfo) {
        showLLMStatus('Repository information not found.', 'error');
        return;
      }
      
      // Disable button and show loading
      generateButton.disabled = true;
      generateButton.textContent = 'Generating...';
      llmStatusSection.classList.remove('hidden');
      resumePointsSection.classList.add('hidden');
      
      try {
        // Get job description if provided
        const jobDescription = jobDescriptionInput.value.trim() || null;
        
        const llmResult = await LLMAPI.generateResumePoints(
          'huggingface', // Provider name (kept for compatibility)
          null, // API key no longer needed - backend handles authentication
          result.repositoryInfo,
          result.repositoryFiles,
          (progress) => {
            if (progress.type === 'preparing') {
              showLLMStatus(progress.message, 'info');
            } else if (progress.type === 'prepared') {
              showLLMStatus(`${progress.message} (${progress.stats.processedFiles}/${progress.stats.totalFiles} files)`, 'info');
            } else if (progress.type === 'formatting') {
              showLLMStatus(progress.message, 'info');
            } else if (progress.type === 'calling') {
              showLLMStatus(progress.message, 'info');
            } else if (progress.type === 'complete') {
              showLLMStatus(progress.message, 'success');
            } else if (progress.type === 'error') {
              showLLMStatus(`Error: ${progress.message}`, 'error');
            }
          },
          {
            model: 'Qwen/Qwen2.5-7B-Instruct',
            temperature: 0.7,
            maxContextTokens: 100000,      // Input/context tokens (for file preparation)
            maxGenerationTokens: 2000,     // Output/generation tokens (for response)
            jobDescription: jobDescription // Optional job description for customization
          }
        );
        
        // Display resume points
        displayResumePoints(llmResult.resumePoints, llmResult.stats);
        
      } catch (error) {
        console.error('Error generating resume points:', error);
        // Extract error message safely, handling different error formats
        const errorMessage = error?.message || 
                            error?.error || 
                            (typeof error === 'string' ? error : String(error)) ||
                            'Unknown error occurred';
        showLLMStatus(`Error: ${errorMessage}`, 'error');
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Resume Points';
      }
    });
  });
  
  function showLLMStatus(message, type = 'info') {
    llmStatusText.textContent = message;
    llmStatusSection.classList.remove('hidden');
    llmStatusText.className = `status-${type}`;
  }
  
  function displayResumePoints(points, stats) {
    resumePointsSection.classList.remove('hidden');
    
    // Format and display resume points
    const formattedPoints = points
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Clean up bullet points
        line = line.replace(/^[-•*]\s*/, '').trim();
        if (!line) return null;
        return `<div class="resume-point">${line}</div>`;
      })
      .filter(Boolean)
      .join('');
    
    resumePoints.innerHTML = formattedPoints || '<div class="resume-point">No resume points generated.</div>';
    
    // Display stats
    const statsHtml = `
      <div class="stats-item">
        <strong>Files Analyzed:</strong> ${stats.processedFiles} of ${stats.totalFiles}
      </div>
      <div class="stats-item">
        <strong>Model:</strong> ${stats.model}
      </div>
      ${stats.truncated ? '<div class="stats-item warning">⚠️ Some files were truncated due to size limits</div>' : ''}
    `;
    resumeStats.innerHTML = statsHtml;
    
    // Scroll to resume points
    resumePointsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Handle copy button
  copyButton.addEventListener('click', () => {
    const text = resumePoints.innerText || resumePoints.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      copyButton.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.style.backgroundColor = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      showLLMStatus('Failed to copy to clipboard', 'error');
    });
  });
});

