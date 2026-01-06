# CodeBrief Chrome Extension

A powerful Chrome extension that analyzes GitHub repositories and automatically generates ATS-friendly resume bullet points using AI. The extension combines GitHub repository analysis with secure backend-powered AI processing to help developers showcase their projects effectively.

## 🚀 Features

### Core Functionality
- **GitHub Repository Analysis**: Fetch and analyze all code files from any public GitHub repository
- **Recursive File Fetching**: Automatically traverses repository structure to collect all relevant files
- **Intelligent Code File Detection**: Filters and processes only code files (excludes binaries, config files, etc.)
- **Auto-Detection**: Automatically detects GitHub repositories when browsing GitHub pages
- **Real-Time Progress Tracking**: Visual progress indicators during file fetching and processing
- **ATS-Optimized Resume Points**: Generates quantifiable, action-oriented resume bullet points optimized for Applicant Tracking Systems

### Technical Features
- **Secure Backend Architecture**: API keys and sensitive operations handled server-side
- **Zero Configuration**: No API keys needed from users - backend handles authentication
- **Fast Processing**: Efficient file processing with size limits and truncation for large repositories
- **Local Storage**: Saves repository data and preferences for quick access
- **Modern UI**: Clean, user-friendly popup interface with status indicators

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Chrome         │         │  Backend API     │         │  Hugging Face   │
│  Extension      │────────▶│  (FastAPI)       │────────▶│  Router API     │
│  (Frontend)     │         │  (Render.com)    │         │  (Qwen Model)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│  GitHub API     │         │  Secure API Key  │
│  (Fetch Files)  │         │  Management      │
└─────────────────┘         └──────────────────┘
```

### Component Architecture

**Frontend (Chrome Extension)**
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker** (`background.js`): Handles background tasks and lifecycle events
- **Content Script** (`content.js`): Detects GitHub repositories on active tabs
- **Popup Interface** (`popup.html/js`): Main user interface
- **Storage API**: Local data persistence

**Backend (FastAPI)**
- **Production URL**: `https://codebrief-backend.onrender.com`
- **Secure Proxy**: Keeps Hugging Face API keys server-side
- **Rate Limiting**: 10 requests/minute per IP
- **CORS Enabled**: Configured for Chrome extension compatibility
- **Input Validation**: Size limits and data validation

**AI Processing**
- **Model**: Qwen/Qwen2.5-7B-Instruct (via Hugging Face Router API)
- **Format**: OpenAI-compatible chat completions
- **Prompt Engineering**: Specialized prompts for ATS-optimized resume points
- **Token Management**: Efficient context and generation token handling

## 📁 Project Structure

```
CodeBrief/
├── backend/                    # FastAPI backend server
│   ├── main.py                # Backend API server (FastAPI)
│   ├── requirements.txt       # Python dependencies
│   ├── run.bat               # Windows startup script
│   └── run.sh                # Linux/Mac startup script
│
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Background service worker
├── content.js                 # Content script (GitHub detection)
├── github-api.js              # GitHub API integration
├── llm-api.js                 # Backend API client & prompt generation
├── popup.html                 # Popup interface HTML
├── popup.css                  # Popup styles
├── popup.js                   # Popup logic and UI interactions
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # This file
```

## 🔧 Installation

### For End Users

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in the top right corner)
3. Click **"Load unpacked"**
4. Select the `CodeBrief` project folder
5. The extension is now installed and ready to use!

### For Developers

1. Clone the repository
2. Load the extension in Chrome (see above)
3. For backend development, see the `backend/` directory
4. Backend is already deployed at: `https://codebrief-backend.onrender.com`

## 📖 Usage

### Basic Workflow

1. **Open Extension**: Click the CodeBrief icon in your Chrome toolbar
2. **Enter Repository URL**: 
   - Manually enter a GitHub repository URL (e.g., `https://github.com/owner/repo`)
   - Or navigate to a GitHub repository page - the URL will auto-fill
3. **Optional: GitHub Token**: Add a GitHub Personal Access Token for higher API rate limits
4. **Fetch Files**: Click "Fetch Repository Files" to analyze the repository
5. **View Results**: Review the list of fetched files and their sizes
6. **Generate Resume Points**: Click "Generate Resume Points" to create ATS-friendly bullet points
7. **Copy & Use**: Copy the generated resume points to your clipboard

### Features in Detail

**Repository Fetching**
- Recursively traverses repository directory structure
- Filters to code files only (excludes binaries, images, etc.)
- Handles large repositories with progress tracking
- Respects GitHub API rate limits

**Resume Generation**
- Analyzes code structure, patterns, and complexity
- Generates quantifiable metrics (file counts, endpoints, features, etc.)
- Creates action-oriented bullet points
- Optimized for ATS (Applicant Tracking Systems)
- No API keys required - backend handles authentication securely

## 🔐 Security & Privacy

### Security Features
- **Server-Side API Key Management**: Hugging Face API keys never exposed to client
- **Rate Limiting**: Backend enforces 10 requests/minute per IP
- **Input Validation**: Size limits (500KB input, 100KB output) prevent abuse
- **CORS Configuration**: Properly configured for Chrome extension security
- **No Data Persistence**: Backend doesn't store user data or prompts
- **Secure HTTPS**: All communications use HTTPS

### Privacy
- Repository data stored locally in Chrome extension storage
- No user data sent to external services except:
  - GitHub API (for repository files)
  - Backend API (for resume generation)
  - Hugging Face API (via backend, for AI processing)
- No tracking or analytics

## 🛠️ Technology Stack

### Frontend
- **JavaScript (ES6+)**: Core extension logic
- **Chrome Extension APIs**: Manifest V3, Storage, Tabs, Runtime
- **GitHub API v3**: Repository file fetching
- **HTML/CSS**: User interface

### Backend
- **Python 3.8+**: Backend language
- **FastAPI**: Modern, fast web framework
- **Uvicorn**: ASGI server
- **httpx**: Async HTTP client for Hugging Face API
- **Pydantic**: Data validation
- **slowapi**: Rate limiting
- **Deployment**: Render.com (production)

### AI/ML
- **Hugging Face Router API**: AI model hosting and inference
- **Model**: Qwen/Qwen2.5-7B-Instruct
- **Format**: OpenAI-compatible chat completions
- **Token Management**: Efficient context and generation token handling

## 📊 Permissions Explained

| Permission | Purpose |
|-----------|---------|
| `storage` | Save repository files, preferences, and tokens locally |
| `activeTab` | Interact with current tab to detect GitHub repositories |
| `https://api.github.com/*` | Fetch repository files and metadata via GitHub API |
| `https://github.com/*` | Detect repository information from GitHub pages |
| `https://codebrief-backend.onrender.com/*` | Communicate with backend API for resume generation |

## 🔄 How It Works

### Workflow

1. **Repository Detection**
   - User navigates to GitHub or enters repository URL
   - Content script detects repository information
   - Popup auto-fills repository URL

2. **File Fetching**
   - Extension calls GitHub API to fetch repository structure
   - Recursively traverses directories
   - Filters code files based on extensions
   - Stores files in Chrome local storage

3. **File Processing**
   - Files are prepared for LLM processing
   - Large repositories are truncated to fit token limits
   - Files are formatted into a prompt-friendly structure

4. **Resume Generation**
   - Formatted prompt sent to backend API
   - Backend validates input and applies rate limiting
   - Backend calls Hugging Face Router API with secure API key
   - AI model generates ATS-optimized resume points
   - Response returned to extension

5. **Display & Copy**
   - Resume points displayed in popup
   - User can copy to clipboard
   - Statistics shown (files analyzed, model used, etc.)

## 🎯 Design Decisions & Insights

### Why a Backend?
- **Security**: API keys must never be exposed in client-side code
- **Rate Limiting**: Centralized rate limiting prevents abuse
- **Scalability**: Backend can handle multiple users and scale independently
- **Maintainability**: API keys and model configuration managed in one place

### Why Qwen/Qwen2.5-7B-Instruct?
- **Open Source**: Free to use with Hugging Face API
- **Instruction-Tuned**: Optimized for following instructions and generating structured output
- **Balanced Performance**: Good balance between quality and speed
- **7B Parameters**: Sufficient for generating high-quality resume points

### Why Hugging Face Router API?
- **OpenAI-Compatible**: Uses familiar chat completions format
- **Reliability**: Managed infrastructure with high availability
- **Free Tier Available**: Allows testing and development
- **Multiple Models**: Easy to switch models if needed

### Architecture Benefits
- **Separation of Concerns**: Frontend handles UI, backend handles AI
- **Security**: Sensitive operations isolated on server
- **Performance**: Backend can cache, optimize, and batch requests
- **Flexibility**: Easy to update models or add features without changing extension

## 🚧 Development

### Backend Development

See the `backend/` directory for backend setup instructions. The backend uses:
- FastAPI for the web framework
- Environment variables for configuration (`.env` file for local development)
- Python 3.8+ required

### Extension Development

1. Make changes to extension files
2. Reload extension in Chrome (`chrome://extensions/` → Reload)
3. Test changes in popup or on GitHub pages

### Testing

- Test with various repository sizes
- Test with different file types
- Verify rate limiting behavior
- Check error handling for invalid inputs

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with ❤️ for developers who want to showcase their GitHub projects effectively**
