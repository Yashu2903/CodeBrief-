# Quick Start Guide - Running the Backend

Follow these steps to run the backend server and test your Chrome extension.

## Prerequisites

1. **Python 3.8+** installed
2. **Hugging Face API Key** - Get a free key at https://huggingface.co/settings/tokens (starts with `hf_`)

## Step 1: Install Dependencies

Open a terminal/command prompt in the `backend` directory and run:

```bash
cd backend
pip install -r requirements.txt
```

## Step 2: Set Up API Key (Choose One Method)

### Method A: Using .env File (Recommended) ⭐

1. Create a file named `.env` in the `backend` directory
2. Add your API key to the file:
   ```
   HF_API_KEY=hf_your_actual_api_key_here
   ```
3. Save the file

**Note**: The `.env` file is automatically loaded by the backend.

### Method B: Set Environment Variable (Windows PowerShell)

```powershell
$env:HF_API_KEY="hf_your_api_key_here"
```

### Method C: Set Environment Variable (Windows CMD)

```cmd
set HF_API_KEY=hf_your_api_key_here
```

## Step 3: Run the Backend Server

### Option 1: Using uvicorn directly

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables auto-reload on code changes (useful for development).

### Option 2: Using the Python script

```bash
python main.py
```

### Option 3: Using the batch file (Windows)

```cmd
run.bat
```

## Step 4: Verify Backend is Running

You should see output like:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Test the health endpoint:**
- Open your browser and go to: http://localhost:8000/health
- You should see: `{"status":"healthy"}`

## Step 5: Test with Chrome Extension

1. **Make sure the backend is running** (Step 3)
2. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `CodeBrief` directory (the parent folder containing `manifest.json`)
3. **Test the extension:**
   - Go to any GitHub repository page
   - Click the extension icon
   - Enter a GitHub repository URL
   - Click "Fetch Repository Files"
   - Click "Generate Resume Points"
   - The extension should now call your backend at `http://localhost:8000`

## Troubleshooting

### Backend won't start

**Error: `HF_API_KEY environment variable is not set`**
- Make sure you set the API key (Step 2)
- If using `.env`, make sure the file is in the `backend` directory
- Verify the file is named exactly `.env` (not `.env.txt`)

**Error: `ModuleNotFoundError: No module named 'fastapi'`**
- Run: `pip install -r requirements.txt`

### Extension can't connect to backend

**CORS errors or connection refused:**
- Make sure the backend is running on port 8000
- Check that you can access http://localhost:8000/health in your browser
- Verify `manifest.json` has `http://localhost:8000/*` in `host_permissions`

**Backend URL mismatch:**
- The extension is configured to use `http://localhost:8000` in `llm-api.js`
- If your backend runs on a different port, update the `BACKEND_URL` in `llm-api.js`

### API Key Issues

**Error: `Backend authentication error`**
- Check that your Hugging Face API key is valid
- Make sure the key starts with `hf_`
- Verify the key is set correctly in your environment or `.env` file

## Next Steps

- **Development**: Keep the backend running with `--reload` for automatic restarts
- **Production**: Deploy the backend to a hosting service (Heroku, Railway, Render, etc.)
- **Update Backend URL**: For production, update `BACKEND_URL` in `llm-api.js` to your deployed URL

