@echo off
REM Simple startup script for Windows

REM Check if HF_API_KEY is set
if "%HF_API_KEY%"=="" (
    echo Error: HF_API_KEY environment variable is not set
    echo Please set it with: set HF_API_KEY=your_key_here
    exit /b 1
)

REM Run the server
echo Starting backend server on http://0.0.0.0:8000
echo HF_API_KEY is set: %HF_API_KEY:~0,10%...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

