# Secure Hugging Face Proxy Backend

A minimal, secure FastAPI backend proxy that allows Chrome extensions to call the Hugging Face Inference API without exposing the API token to users.

## Why This Backend Exists

**Security**: The Hugging Face API token must never be exposed to client-side code (Chrome extensions). If the token is included in extension code or sent from the browser, it can be:
- Extracted from extension source code
- Intercepted in network requests
- Viewed in browser developer tools

This backend keeps the token securely on the server side, ensuring it's never exposed to end users.

## Features

- ✅ Secure token management (environment variable only)
- ✅ Rate limiting (10 requests/minute per IP)
- ✅ Input size limits (500KB max)
- ✅ CORS enabled for Chrome extension compatibility
- ✅ No data persistence (stateless)
- ✅ No logging of sensitive data (prompts, responses)
- ✅ Graceful error handling (401, 429, 503)
- ✅ Request timeout protection

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variable

Set the Hugging Face API key as an environment variable:

**Linux/Mac:**
```bash
export HF_API_KEY="hf_your_api_key_here"
```

**Windows (PowerShell):**
```powershell
$env:HF_API_KEY="hf_your_api_key_here"
```

**Windows (CMD):**
```cmd
set HF_API_KEY=hf_your_api_key_here
```

**Or create a `.env` file** (recommended for development):
```
HF_API_KEY=hf_your_api_key_here
```

### 3. Run the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or use the built-in runner:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST `/generate-resume`

Generate resume points from repository information and formatted prompt.

**Request:**
```json
{
  "repoInfo": {
    "owner": "username",
    "repo": "repository-name",
    "url": "https://github.com/username/repository-name"
  },
  "formattedPrompt": "Your formatted prompt string here..."
}
```

**Response:**
```json
{
  "resumePoints": "Generated resume bullet points..."
}
```

**Error Response:**
```json
{
  "error": "error_type",
  "message": "Human-readable error message",
  "status_code": 400
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Security Considerations

1. **No Authentication**: This is a public proxy. In production, consider adding API keys or rate limiting by API key.

2. **CORS**: Currently allows all origins. For production, restrict to specific Chrome extension IDs:
   ```python
   allow_origins=["chrome-extension://your-extension-id"]
   ```

3. **Rate Limiting**: Currently 10 requests/minute per IP. Adjust in `main.py`:
   ```python
   @limiter.limit("10/minute")
   ```

4. **Input Validation**: Maximum input size is 500KB. Adjust `MAX_INPUT_SIZE` in `main.py` if needed.

## Error Handling

The backend handles common Hugging Face API errors:

- **401**: Invalid API token (returns 502 to hide token issues)
- **429**: Rate limit exceeded (returns 503)
- **503**: Model loading (returns 503 with helpful message)
- **Timeout**: Request timeout (returns 504)

## Development

### Running in Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing the API

```bash
curl -X POST http://localhost:8000/generate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "repoInfo": {
      "owner": "test",
      "repo": "test",
      "url": "https://github.com/test/test"
    },
    "formattedPrompt": "Generate resume points for this repository..."
  }'
```

## Production Deployment

1. Use a production ASGI server like Gunicorn with Uvicorn workers:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. Set up environment variables securely (use your hosting platform's secret management)

3. Configure reverse proxy (nginx, Caddy, etc.) for HTTPS

4. Consider adding:
   - API key authentication
   - More sophisticated rate limiting
   - Request logging (without sensitive data)
   - Monitoring and alerting

## No Data Persistence

This backend is stateless and does not:
- Store user data
- Log prompts or responses
- Maintain sessions
- Use databases

All requests are processed and immediately discarded after responding.

