
# CodeBrief Chrome Extension

Chrome extension that analyzes GitHub repositories by parsing source files and automatically generates ATS-optimized resume bullet points based on project structure, technologies, and impact.

## Features

- Popup interface for extension controls
- Background service worker for background tasks
- Content script for page interaction
- Storage API for saving preferences

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
└── icons/             # Extension icons (create your own)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Icons

You need to create icon files for the extension:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

You can use any image editing tool or online icon generators to create these.

## Usage

1. Click the extension icon in the Chrome toolbar to open the popup
2. Toggle the extension on/off using the switch
3. The extension will run content scripts on all web pages

## Permissions

- `storage`: Used to save extension preferences
- `activeTab`: Used to interact with the current tab

## Manifest Version

This extension uses Manifest V3, the latest Chrome extension format.

## License

MIT

>>>>>>> 1627339 (Intial Commit)
