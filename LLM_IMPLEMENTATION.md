# LLM Feature Implementation Guide

## Overview

The CodeBrief extension includes LLM integration to generate ATS-friendly resume points from GitHub repository code. The feature uses Hugging Face's free Inference API with Mistral-7B-Instruct model.

## What Was Implemented

### 1. **LLM API Utility (`llm-api.js`)**
   - Uses Hugging Face Inference API (FREE)
   - Model: Mistral-7B-Instruct-v0.2
   - Automatic file preparation and truncation for token limits
   - Smart file prioritization (important files first)
   - Progress callbacks for UI updates

### 2. **UI Updates (`popup.html` & `popup.css`)**
   - Hugging Face API key input field (optional)
   - Generate Resume Points button
   - Resume points display section
   - Copy to clipboard functionality
   - Statistics display

### 3. **Popup Logic (`popup.js`)**
   - LLM section appears after files are fetched
   - API key validation
   - Progress tracking during generation
   - Resume points formatting and display
   - Copy functionality

### 4. **Manifest Updates (`manifest.json`)**
   - Added permissions for OpenAI and Anthropic APIs

## How to Use

### Step 1: Fetch Repository Files
1. Enter a GitHub repository URL
2. Optionally add a GitHub token
3. Click "Fetch Repository Files"
4. Wait for files to be fetched

### Step 2: Generate Resume Points
1. After files are fetched, the "Generate Resume Points" section appears
2. (Optional) Enter your Hugging Face API key for higher rate limits
   - Get free key at https://huggingface.co/settings/tokens
   - Leave empty to use free tier (no key needed)
3. Click "Generate Resume Points"
4. Wait for generation (usually 20-40 seconds, first request may take longer)
5. View the generated resume points
6. Click "Copy" to copy all points to clipboard

## API Key Setup (Optional)

### Hugging Face API Key (Optional but Recommended)
1. Go to https://huggingface.co/
2. Sign in or create a free account
3. Go to Settings → Access Tokens
4. Create a new token (read access is enough)
5. Copy the key (starts with `hf_`)
6. Paste it in the extension for higher rate limits

**Note**: The extension works without an API key using the free tier, but you'll have lower rate limits (~30 requests/hour). With an API key, you get higher limits.

## Features

### Smart File Processing
- Automatically prioritizes important files (src/, lib/, main files)
- Truncates files if repository is too large
- Handles token limits intelligently
- Shows statistics about processed files

### ATS-Optimized Output
- Action-verb focused bullet points
- Quantifiable metrics when possible
- Technical skills highlighted
- Impact and results emphasized
- STAR method format

### User Experience
- Progress updates during generation
- Error handling with clear messages
- Copy to clipboard functionality
- Statistics display
- Responsive UI

## File Structure

```
llm-api.js          # LLM API integration utilities
popup.html          # Updated with LLM UI elements
popup.js            # Updated with LLM processing logic
popup.css           # Styling for LLM section
manifest.json       # Added API permissions
```

## Technical Details

### Token Limits
- Default max tokens: 100,000 (~75K characters)
- Files are truncated if needed
- Important files are prioritized

### Model Used
- **Hugging Face**: `mistralai/Mistral-7B-Instruct-v0.2` (free, instruction-tuned)
- Can be changed in code if needed

### Error Handling
- Invalid API key detection
- Rate limit handling
- Network error handling
- Clear error messages

## Cost Considerations

### Hugging Face (FREE)
- **Completely free** - No cost per request
- Free tier: ~30 requests/hour without API key
- With API key: Higher rate limits (still free)
- First request may take 20-30 seconds (model loading)

## Troubleshooting

### "Invalid API key" Error
- Verify your API key is correct
- Check if key has proper permissions
- Ensure no extra spaces in key

### "Rate limit exceeded" Error
- Wait a few moments and try again
- Check your API account limits
- Consider upgrading your plan

### No Resume Points Generated
- Check console for errors
- Verify repository files were fetched
- Ensure API key is valid
- Check network connection

### Files Truncated Warning
- Large repositories may have files truncated
- Important files are prioritized
- Consider using a larger model for better results

## Future Enhancements

Potential improvements:
- Support for more LLM providers
- Custom prompt templates
- Export to different formats
- Batch processing multiple repositories
- Resume point editing
- Template customization

