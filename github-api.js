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
/**
 * Get file blob content using GitHub Git Blob API (for large files)
 */
async function getFileBlob(owner, repo, sha, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = token.startsWith('ghp_') ? `token ${token}` : `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Blob API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Decode base64 content
    if (data.content && data.encoding === 'base64') {
      return atob(data.content.replace(/\s/g, ''));
    }
    
    return data.content || '';
  } catch (error) {
    console.error(`Error fetching blob ${sha}:`, error);
    throw error;
  }
}

/**
 * Get file contents from GitHub API
 * Handles both small files (direct content) and large files (blob API)
 */
async function getFileContent(owner, repo, path, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  // Support both token and Bearer formats
  if (token) {
    headers['Authorization'] = token.startsWith('ghp_') ? `token ${token}` : `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        throw new Error(`API rate limit exceeded. Remaining: ${rateLimitRemaining || 'unknown'}. Consider using a GitHub token.`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if file is too large (GitHub API doesn't return content for files >1MB)
    if (data.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (${(data.size / 1024).toFixed(1)} KB). Maximum supported: ${(MAX_FILE_SIZE / 1024).toFixed(0)} KB`);
    }
    
    // If content is base64 encoded, decode it
    if (data.content) {
      try {
        const content = atob(data.content.replace(/\s/g, ''));
        return {
          path: data.path,
          name: data.name,
          content: content,
          size: data.size,
          encoding: data.encoding
        };
      } catch (decodeError) {
        console.warn(`Failed to decode content for ${path}, trying blob API...`);
        // If decoding fails, try blob API if we have a sha
        if (data.sha) {
          const blobContent = await getFileBlob(owner, repo, data.sha, token);
          return {
            path: data.path,
            name: data.name,
            content: blobContent,
            size: data.size,
            encoding: 'base64'
          };
        }
        throw decodeError;
      }
    }
    
    // If no content but we have sha, use blob API (for large files)
    if (data.sha && data.size <= MAX_FILE_SIZE) {
      const blobContent = await getFileBlob(owner, repo, data.sha, token);
      return {
        path: data.path,
        name: data.name,
        content: blobContent,
        size: data.size,
        encoding: 'base64'
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
  
  // Support both token and Bearer formats for GitHub authentication
  if (token) {
    headers['Authorization'] = token.startsWith('ghp_') ? `token ${token}` : `Bearer ${token}`;
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
  '.env', '.config', '.conf', '.ini', '.toml'
];

/**
 * Files without extensions that should be included
 */
const SPECIAL_FILES = [
  'dockerfile', 'makefile', 'readme', 'license', 'changelog', 'contributing',
  'authors', 'credits', 'install', 'copying', 'notice', 'version', 'vagrantfile',
  'rakefile', 'gemfile', 'capfile', 'guardfile', 'procfile', 'appfile',
  'deliverfile', 'fastfile', 'matchfile', 'snapfile', 'scanfile', 'gemspec'
];

/**
 * Maximum file size to fetch (1MB in bytes)
 * Files larger than this will be skipped
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Check if a file is a code file based on extension or filename
 */
function isCodeFile(filePath) {
  const fileName = filePath.split('/').pop().toLowerCase();
  const lastDotIndex = fileName.lastIndexOf('.');
  
  // Check for files without extensions (like Dockerfile, Makefile)
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return SPECIAL_FILES.includes(fileName);
  }
  
  // Check for files with extensions
  const ext = fileName.substring(lastDotIndex).toLowerCase();
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
        // Only fetch code files and skip files that are too large
        if (isCodeFile(item.path)) {
          // Skip files that are too large before attempting to fetch
          if (item.size && item.size > MAX_FILE_SIZE) {
            console.warn(`Skipping large file ${item.path} (${(item.size / 1024).toFixed(1)} KB)`);
            if (onProgress) {
              onProgress({ type: 'skipped', path: item.path, reason: 'File too large' });
            }
            continue;
          }
          
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
            // Continue processing other files even if one fails
          }
        }
      } else if (item.type === 'dir') {
        // Recursively fetch files from subdirectories
        // Skip common ignored directories
        const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', 
                           'venv', '__pycache__', '.venv', 'target', 'bin', 'obj',
                           '.idea', '.vscode', '.vs', 'coverage', '.nyc_output',
                           '.cache', '.tmp', 'tmp', 'temp', 'logs', 'log'];
        if (!ignoredDirs.includes(item.name)) {
          try {
            const subFiles = await getAllCodeFiles(owner, repo, item.path, onProgress, token);
            files.push(...subFiles);
          } catch (error) {
            console.warn(`Error fetching directory ${item.path}:`, error.message);
            // Continue with other directories even if one fails
            if (onProgress) {
              onProgress({ type: 'error', path: item.path, error: error.message });
            }
          }
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
  getFileBlob,
  getDirectoryContents,
  getAllCodeFiles,
  fetchRepositoryFiles,
  isCodeFile,
  MAX_FILE_SIZE
};

// Also expose functions directly for easier access
window.parseGitHubUrl = parseGitHubUrl;
window.fetchRepositoryFiles = fetchRepositoryFiles;

