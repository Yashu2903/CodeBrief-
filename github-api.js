// GitHub API utility functions for fetching repository files

/**
 * Parse GitHub repository URL to extract owner and repo name
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/
 * - github.com/owner/repo
 * - owner/repo
 */
function parseGitHubUrl(url) {
  // Remove trailing slash and whitespace
  url = url.trim().replace(/\/$/, '');
  
  // Extract owner/repo from various URL formats
  let match = url.match(/(?:github\.com\/|^)([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/);
  if (!match) {
    throw new Error('Invalid GitHub URL format. Use: https://github.com/owner/repo');
  }
  
  return {
    owner: match[1],
    repo: match[2]
  };
}

/**
 * Get file contents from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path in repository
 * @param {string} token - Optional GitHub personal access token
 */
async function getFileContent(owner, repo, path, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      if (response.status === 403) {
        throw new Error('API rate limit exceeded. Consider using a GitHub token.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // If content is base64 encoded, decode it
    if (data.content) {
      const content = atob(data.content.replace(/\s/g, ''));
      return {
        path: data.path,
        name: data.name,
        content: content,
        size: data.size,
        encoding: data.encoding
      };
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching file ${path}:`, error);
    throw error;
  }
}

/**
 * Get directory contents from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Directory path (empty string for root)
 * @param {string} token - Optional GitHub personal access token
 */
async function getDirectoryContents(owner, repo, path = '', token = null) {
  const url = path 
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
    : `https://api.github.com/repos/${owner}/${repo}/contents`;
    
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Directory not found: ${path}`);
      }
      if (response.status === 403) {
        throw new Error('API rate limit exceeded. Consider using a GitHub token.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error(`Error fetching directory ${path}:`, error);
    throw error;
  }
}

/**
 * Common code file extensions to include
 */
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.r',
  '.m', '.mm', '.sh', '.bash', '.ps1', '.yml', '.yaml', '.json', '.xml',
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  '.dart', '.lua', '.pl', '.pm', '.sql', '.graphql', '.md', '.txt',
  '.dockerfile', '.env', '.config', '.conf', '.ini', '.toml'
];

/**
 * Check if a file is a code file based on extension
 */
function isCodeFile(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Recursively fetch all code files from a GitHub repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Current directory path (default: root)
 * @param {Function} onProgress - Optional progress callback
 * @param {string} token - Optional GitHub personal access token
 */
async function getAllCodeFiles(owner, repo, path = '', onProgress = null, token = null) {
  const files = [];
  
  try {
    const contents = await getDirectoryContents(owner, repo, path, token);
    
    // Process each item in the directory
    for (const item of contents) {
      if (item.type === 'file') {
        // Only fetch code files
        if (isCodeFile(item.path)) {
          try {
            if (onProgress) {
              onProgress({ type: 'fetching', path: item.path });
            }
            
            const fileContent = await getFileContent(owner, repo, item.path, token);
            files.push(fileContent);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn(`Skipping file ${item.path}:`, error.message);
            if (onProgress) {
              onProgress({ type: 'error', path: item.path, error: error.message });
            }
          }
        }
      } else if (item.type === 'dir') {
        // Recursively fetch files from subdirectories
        // Skip common ignored directories
        const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', 
                           'venv', '__pycache__', '.venv', 'target', 'bin', 'obj'];
        if (!ignoredDirs.includes(item.name)) {
          const subFiles = await getAllCodeFiles(owner, repo, item.path, onProgress, token);
          files.push(...subFiles);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching directory ${path}:`, error);
    throw error;
  }
  
  return files;
}

/**
 * Main function to fetch all code files from a GitHub repository
 * @param {string} repoUrl - GitHub repository URL
 * @param {Function} onProgress - Optional progress callback
 * @param {string} token - Optional GitHub personal access token
 */
async function fetchRepositoryFiles(repoUrl, onProgress = null, token = null) {
  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    
    if (onProgress) {
      onProgress({ type: 'start', owner, repo });
    }
    
    const files = await getAllCodeFiles(owner, repo, '', onProgress, token);
    
    if (onProgress) {
      onProgress({ type: 'complete', fileCount: files.length });
    }
    
    return {
      owner,
      repo,
      files,
      totalFiles: files.length
    };
  } catch (error) {
    if (onProgress) {
      onProgress({ type: 'error', error: error.message });
    }
    throw error;
  }
}

// Export functions globally for use in popup.js
window.GitHubAPI = {
  parseGitHubUrl,
  getFileContent,
  getDirectoryContents,
  getAllCodeFiles,
  fetchRepositoryFiles,
  isCodeFile
};

// Also expose functions directly for easier access
window.parseGitHubUrl = parseGitHubUrl;
window.fetchRepositoryFiles = fetchRepositoryFiles;

