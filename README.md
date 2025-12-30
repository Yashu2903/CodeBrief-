
# CodeBrief Chrome Extension

A Chrome extension that analyzes GitHub repositories by fetching and parsing source files, then generates ATS-friendly resume bullet points based on project structure, technologies, and code analysis.

## Features

- **GitHub Repository Analysis**: Fetch all code files from any GitHub repository
- **Recursive File Fetching**: Automatically traverses repository structure
- **Code File Detection**: Filters and processes only relevant code files
- **Popup Interface**: User-friendly interface for repository URL input
- **Background Service Worker**: Handles background tasks and data management
- **Content Script Integration**: Auto-detects GitHub repositories on active tabs
- **Storage API**: Saves repository data and preferences
- **Progress Tracking**: Real-time progress updates during file fetching

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select this project folder

## Development

### File Structure

```
CodeBrief/
├── manifest.json       # Extension manifest (configuration)
├── background.js       # Background service worker
├── popup.html         # Popup HTML
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── content.js         # Content script (runs on web pages)
└── icons/             # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Icons

The extension includes custom icons for all required sizes:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

All icons are properly configured in `manifest.json`.

## Usage

1. Click the extension icon in the Chrome toolbar to open the popup
2. Enter a GitHub repository URL (e.g., `https://github.com/owner/repo`)
   - Or navigate to a GitHub repository page - the URL will auto-fill
3. Optionally add a GitHub Personal Access Token for higher rate limits
4. Click "Fetch Repository Files" to start analyzing
5. View the list of fetched files and wait for processing to complete
6. Repository files are stored and ready for LLM processing (coming soon)

## Permissions

- `storage`: Used to save repository files, preferences, and GitHub tokens
- `activeTab`: Used to interact with the current tab and detect GitHub repositories
- `https://api.github.com/*`: Required for fetching repository files via GitHub API
- `https://github.com/*`: Required for detecting repositories on GitHub pages

## Manifest Version

This extension uses Manifest V3, the latest Chrome extension format.

## License

MIT
