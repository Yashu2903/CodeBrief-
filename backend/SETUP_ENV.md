# Setting the HF_API_KEY Environment Variable

## Quick Setup (Choose One Method)

### Method 1: Using .env File (Easiest for Development) ⭐ Recommended

1. **Create a `.env` file** in the `backend` directory:
   ```
   backend/
   ├── .env          ← Create this file
   ├── main.py
   └── requirements.txt
   ```

2. **Add your API key to `.env`**:
   ```
   HF_API_KEY=hf_your_actual_api_key_here
   ```

3. **The code will automatically load it** (python-dotenv is included in requirements.txt)

4. **Run the server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

**Note**: The `.env` file is already in `.gitignore`, so it won't be committed to git.

---

### Method 2: Command Line (Temporary - Current Session Only)

**Windows PowerShell:**
```powershell
$env:HF_API_KEY="hf_your_api_key_here"
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Windows CMD:**
```cmd
set HF_API_KEY=hf_your_api_key_here
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Linux/Mac:**
```bash
export HF_API_KEY="hf_your_api_key_here"
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Method 3: System Environment Variables (Permanent)

**Windows:**
1. Open "Environment Variables" (search in Start menu)
2. Click "New" under "User variables"
3. Variable name: `HF_API_KEY`
4. Variable value: `hf_your_api_key_here`
5. Click OK and restart your terminal/IDE

**Linux/Mac:**
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export HF_API_KEY="hf_your_api_key_here"
```
Then reload: `source ~/.bashrc` (or `source ~/.zshrc`)

---

### Method 4: IDE/Editor Settings

**VS Code:**
1. Create `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: FastAPI",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": ["main:app", "--host", "0.0.0.0", "--port", "8000"],
            "env": {
                "HF_API_KEY": "hf_your_api_key_here"
            }
        }
    ]
}
```

**PyCharm:**
1. Run → Edit Configurations
2. Add environment variable: `HF_API_KEY=hf_your_api_key_here`

---

## Production Deployment

For production (Heroku, Railway, Render, etc.), set the environment variable in your hosting platform's dashboard:

- **Heroku**: Settings → Config Vars → Add `HF_API_KEY`
- **Railway**: Variables tab → Add `HF_API_KEY`
- **Render**: Environment → Add `HF_API_KEY`
- **Docker**: Use `-e HF_API_KEY=...` or docker-compose.yml

---

## Verify It's Set

Check if the variable is set:
```bash
# Windows PowerShell
echo $env:HF_API_KEY

# Windows CMD
echo %HF_API_KEY%

# Linux/Mac
echo $HF_API_KEY
```

If the server starts without errors, the variable is set correctly!

