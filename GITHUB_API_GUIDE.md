# How to Read All Files from a GitHub Repository

## Overview

This Chrome extension uses the **GitHub REST API** to recursively fetch all code files from a GitHub repository. Here's how it works:

## How It Works

### 1. **GitHub REST API Endpoints Used**

- **Get Repository Contents**: `GET /repos/{owner}/{repo}/contents/{path}`
  - Fetches files and directories at a given path
  - Returns an array of file/directory objects
  - Each object has properties like `type`, `name`, `path`, `sha`, `size`, etc.

- **Get File Contents**: Uses the same endpoint, but for files:
  - Files with content < 1MB: content is included directly as base64-encoded string
  - Files > 1MB: need to use Git Blob API (not implemented in current version)

### 2. **Recursive File Fetching Process**

The extension follows these steps:

1. **Parse Repository URL**: Extracts `owner` and `repo` from the GitHub URL
   - Supports formats: `https://github.com/owner/repo`, `owner/repo`, etc.

2. **Fetch Root Directory**: Gets contents of repository root

3. **Recursively Traverse**: For each item:
   - **If it's a file**: Check if it's a code file (by extension), then fetch its content
   - **If it's a directory**: Recursively fetch its contents
   - **Skip ignored directories**: `node_modules`, `.git`, `dist`, `build`, etc.

4. **Filter Code Files**: Only includes files with code extensions:
   - JavaScript, TypeScript, Python, Java, C++, C, Go, Rust, Ruby, PHP, Swift, etc.
   - Configuration files: JSON, YAML, XML, etc.
   - Markup: HTML, CSS, Markdown, etc.
   - See `CODE_EXTENSIONS` array in `github-api.js` for full list

5. **Decode Content**: Files are base64-encoded in API response, so decode to get actual text

### 3. **Key Functions**

#### `parseGitHubUrl(url)`
Parses various GitHub URL formats to extract owner and repository name.

#### `getDirectoryContents(owner, repo, path, token)`
Fetches contents of a directory at the specified path.

#### `getFileContent(owner, repo, path, token)`
Fetches and decodes the content of a specific file.

#### `getAllCodeFiles(owner, repo, path, onProgress, token)`
Recursively fetches all code files from a repository directory.

#### `fetchRepositoryFiles(repoUrl, onProgress, token)`
Main entry point that orchestrates the entire fetching process.

### 4. **GitHub API Authentication**

- **Without Token**: 
  - Rate limit: 60 requests/hour per IP
  - Sufficient for small repositories
  - Public repositories only

- **With Personal Access Token**:
  - Rate limit: 5,000 requests/hour
  - Can access private repositories (if token has permissions)
  - Recommended for larger repositories

#### How to Create a GitHub Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `public_repo` (for public repositories)
   - `repo` (for private repositories)
4. Copy the token (starts with `ghp_`)
5. Paste it in the extension's token field

### 5. **Error Handling**

- **404 Not Found**: Repository or file doesn't exist or is private
- **403 Forbidden**: Rate limit exceeded (get a token!)
- **Network Errors**: Handled with try-catch blocks

### 6. **Rate Limiting Protection**

- Small delay (100ms) between file fetches to avoid hitting rate limits
- Progress callbacks to show fetching status
- Error messages when rate limits are hit

### 7. **Data Storage**

Fetched files are stored in Chrome's local storage:
```javascript
{
  repositoryFiles: [
    {
      path: "src/index.js",
      name: "index.js",
      content: "// file content...",
      size: 1234
    },
    // ... more files
  ],
  repositoryInfo: {
    owner: "username",
    repo: "repository-name",
    url: "https://github.com/username/repository-name"
  }
}
```

## Usage Example

```javascript
// Fetch all files from a repository
const result = await fetchRepositoryFiles(
  'https://github.com/owner/repo',
  (progress) => {
    console.log('Progress:', progress);
  },
  'ghp_your_token_here' // optional
);

console.log(`Fetched ${result.totalFiles} files`);
console.log('Files:', result.files);
```

## Next Steps: LLM Integration

The fetched files are stored and ready to be sent to an LLM API. You'll need to:

1. Prepare the file data for the LLM (format, truncate if needed)
2. Send to LLM API (OpenAI, Anthropic, etc.)
3. Process the response to extract ATS-friendly resume points
4. Display or export the results

## Limitations

- Files > 1MB need Git Blob API (current implementation uses Contents API only)
- Rate limits may affect large repositories
- Binary files are skipped (only text files with known extensions)
- Large repositories may take significant time to fetch

