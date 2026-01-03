#!/bin/bash
# Simple startup script for the backend

# Check if HF_API_KEY is set
if [ -z "$HF_API_KEY" ]; then
    echo "Error: HF_API_KEY environment variable is not set"
    echo "Please set it with: export HF_API_KEY='your_key_here'"
    exit 1
fi

# Run the server
echo "Starting backend server on http://0.0.0.0:8000"
echo "HF_API_KEY is set: ${HF_API_KEY:0:10}..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

