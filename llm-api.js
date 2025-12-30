// LLM API utility functions for generating ATS-friendly resume points

/**
 * Prepare repository files for LLM processing
 * Truncates files if needed to fit within token limits
 * @param {Array} files - Array of file objects with path and content
 * @param {number} maxContextTokens - Maximum context/input tokens to use (default: 100000 for ~75K chars)
 */
function prepareFilesForLLM(files, maxContextTokens = 100000) {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxContextTokens * 4;
  let totalChars = 0;
  const preparedFiles = [];
  
  // Sort files by importance (prioritize main code files)
  const importantPaths = ['src', 'lib', 'app', 'main', 'index', 'package.json', 'README'];
  const sortedFiles = [...files].sort((a, b) => {
    const aImportant = importantPaths.some(path => a.path.includes(path));
    const bImportant = importantPaths.some(path => b.path.includes(path));
    if (aImportant && !bImportant) return -1;
    if (!aImportant && bImportant) return 1;
    return a.path.localeCompare(b.path);
  });
  
  for (const file of sortedFiles) {
    const fileContent = file.content || '';
    const fileChars = fileContent.length;
    
    // If adding this file would exceed limit, truncate it
    if (totalChars + fileChars > maxChars) {
      const remainingChars = maxChars - totalChars;
      if (remainingChars > 100) { // Only add if meaningful content remains
        preparedFiles.push({
          ...file,
          content: fileContent.substring(0, remainingChars) + '\n... [truncated]'
        });
      }
      break;
    }
    
    preparedFiles.push(file);
    totalChars += fileChars;
  }
  
  return {
    files: preparedFiles,
    totalFiles: files.length,
    processedFiles: preparedFiles.length,
    totalChars,
    truncated: preparedFiles.length < files.length
  };
}

/**
 * Format repository files into a prompt-friendly structure
 * @param {Object} repoInfo - Repository information
 * @param {Array} files - Array of prepared files
 */
function formatFilesForPrompt(repoInfo, files) {
  let formatted = `Repository: ${repoInfo.owner}/${repoInfo.repo}\n`;
  formatted += `URL: ${repoInfo.url}\n\n`;
  formatted += `Code Files (${files.length} files):\n\n`;
  
  files.forEach((file, index) => {
    formatted += `--- File ${index + 1}: ${file.path} ---\n`;
    formatted += `${file.content}\n\n`;
  });
  
  return formatted;
}

/**
 * Create prompt for generating ATS-friendly resume points
 * @param {Object} repoInfo - Repository information
 * @param {string} formattedFiles - Formatted file contents
 */
function createResumePrompt(repoInfo, formattedFiles) {
  return `You are an expert resume writer and technical recruiter. Analyze the following GitHub repository code and generate ATS-friendly resume bullet points.

Repository: ${repoInfo.owner}/${repoInfo.repo}

Instructions:
1. Analyze the codebase to understand:
   - Technologies and frameworks used
   - Key features and functionality
   - Architecture and design patterns
   - Complexity and scale of the project
   - Impact and business value
   - Count files, endpoints, features, test coverage, etc.

2. Generate 3-5 ATS-friendly resume bullet points that:
   - Start with strong action verbs (Developed, Built, Implemented, Designed, etc.)
   - **CRITICAL: EVERY bullet point MUST include at least one quantifiable number or metric**
   - Highlight technical skills and technologies
   - Show impact and results with specific numbers
   - Are specific and concrete
   - Follow STAR method (Situation, Task, Action, Result) when applicable

3. **REQUIRED: Include numbers for:**
   - Number of files, modules, or components created
   - Number of API endpoints, routes, or features implemented
   - Performance improvements (e.g., "reduced response time by 40%", "handles 1000+ requests/sec")
   - Scale metrics (e.g., "supports 10,000+ concurrent users", "processes 1M+ records")
   - Code metrics (e.g., "10,000+ lines of code", "50+ test cases", "95% test coverage")
   - Database/architecture metrics (e.g., "5 database tables", "3 microservices", "10+ API endpoints")
   - User impact (e.g., "serves 100+ users", "handles 50+ game sessions simultaneously")
   - Time/effort savings (e.g., "reduced deployment time by 60%", "automated 20+ manual processes")
   - If exact numbers aren't visible, estimate based on code structure (count files, classes, functions, endpoints)

4. Format each bullet point on a new line with a bullet (•)

5. Focus on:
   - Technical achievements with measurable impact
   - Problem-solving with quantifiable results
   - Code quality and architecture with specific metrics
   - Performance optimizations with percentage or time improvements
   - Integration and APIs with endpoint/feature counts
   - Testing and quality assurance with coverage percentages or test counts
   - Collaboration and teamwork with team size or project scope

**Example format with numbers:**
• Developed a RESTful API with 8+ endpoints using FastAPI, handling 500+ requests/minute and reducing response time by 35%
• Built a scalable backend system supporting 100+ concurrent game sessions with 99.9% uptime
• Implemented 15+ game features including collision detection and dynamic speed adjustments, improving gameplay smoothness by 40%

Repository Code:
${formattedFiles}

Generate the resume bullet points now. Remember: EVERY bullet point MUST include at least one number or metric to show quantifiable impact.`;
}

/**
 * Call Hugging Face Inference API to generate resume points (FREE)
 * @param {string} apiKey - Hugging Face API key 
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options (model, temperature, maxGenerationTokens, etc.)
 * @returns {Promise<Object>} Object with content and token usage { content: string, usage: { prompt_tokens, completion_tokens, total_tokens } }
 */
async function callHuggingFace(apiKey, prompt, options = {}) {
  const {
    model = 'Qwen/Qwen2.5-7B-Instruct',
    temperature = 0.7,
    maxGenerationTokens = 2000  // Generation/output tokens (separate from context tokens)
  } = options;
  

  const url = 'https://router.huggingface.co/v1/chat/completions';
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model, 
        messages: [
            {
                role: 'system',
                content: 'You are an expert technical recruiter and software engineer who writes concise ATS-optimized resume bullets. You ALWAYS include quantifiable numbers and metrics in every bullet point to demonstrate measurable impact and achievements.'
              },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxGenerationTokens,  // Generation tokens (output)
        temperature: temperature
      })
    });
    
    if (!response.ok) {
      let errorMessage = '';
      try {
        const errorData = await response.json();
        // Handle different error response formats
        errorMessage = errorData.error?.message || 
                      errorData.error || 
                      errorData.message || 
                      errorData.detail ||
                      (typeof errorData === 'string' ? errorData : '');
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText;
      }
      
      // Handle specific status codes with helpful messages
      if (response.status === 401) {
        throw new Error('Authentication required. Please add your Hugging Face API key. Get a free key at https://huggingface.co/settings/tokens (the key should start with "hf_")');
      }
      if (response.status === 503) {
        throw new Error('Model is loading. Please wait 10-20 seconds and try again. This is normal for free Hugging Face models.');
      }
      if (response.status === 404) {
        throw new Error(`Model not found: ${model}. ${errorMessage ? `Details: ${errorMessage}` : 'Please check the model name is correct.'}`);
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again, or add your Hugging Face API key for higher limits.');
      }
      
      // Generic error with extracted message
      const finalMessage = errorMessage 
        ? `Hugging Face API error (${response.status}): ${errorMessage}`
        : `Hugging Face API error: ${response.status} ${response.statusText}`;
      throw new Error(finalMessage);
    }
    

    const data = await response.json();
    
    // Log response for debugging (remove in production if needed)
    console.log('Hugging Face API response:', data);
    
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const content = data.choices[0].message.content.trim();
      
      // Extract token usage from response (if available)
      const usage = data.usage || {};
      const tokenUsage = {
        prompt_tokens: usage.prompt_tokens || null,      // Context/input tokens
        completion_tokens: usage.completion_tokens || null,  // Generation/output tokens
        total_tokens: usage.total_tokens || null
      };
      
      return {
        content: content,
        usage: tokenUsage
      };
    }
    
    // Provide more detailed error if response format is unexpected
    const responseStr = JSON.stringify(data).substring(0, 200);
    throw new Error(`Unexpected response format from Hugging Face API. Response: ${responseStr}`);
  } catch (error) {
    console.error('Hugging Face API error:', error);
    // Ensure error is always an Error object with a proper message
    if (error instanceof Error) {
      throw error;
    } else if (typeof error === 'object' && error !== null) {
      // If error is an object, try to extract a meaningful message
      const message = error.message || error.error || error.detail || JSON.stringify(error);
      throw new Error(`Hugging Face API error: ${message}`);
    } else {
      throw new Error(`Hugging Face API error: ${String(error)}`);
    }
  }
}

/**
 * Main function to generate resume points from repository files
 * Uses Hugging Face (free) API
 * @param {string} provider - LLM provider (always 'huggingface')
 * @param {string} apiKey - Hugging Face API key (optional)
 * @param {Object} repoInfo - Repository information
 * @param {Array} files - Array of repository files
 * @param {Function} onProgress - Optional progress callback
 * @param {Object} options - Additional options (maxContextTokens, maxGenerationTokens, etc.)
 */
async function generateResumePoints(provider, apiKey, repoInfo, files, onProgress = null, options = {}) {
  try {
    if (onProgress) {
      onProgress({ type: 'preparing', message: 'Preparing files for analysis...' });
    }
    
    // Prepare files (truncate if needed) - uses maxContextTokens for input/context
    const maxContextTokens = options.maxContextTokens || options.maxTokens || 100000;
    const prepared = prepareFilesForLLM(files, maxContextTokens);
    
    if (onProgress) {
      onProgress({ 
        type: 'prepared', 
        message: `Processing ${prepared.processedFiles} of ${prepared.totalFiles} files...`,
        stats: prepared
      });
    }
    
    // Format files for prompt
    const formattedFiles = formatFilesForPrompt(repoInfo, prepared.files);
    
    if (onProgress) {
      onProgress({ type: 'formatting', message: 'Formatting code for analysis...' });
    }
    
    // Create prompt
    const prompt = createResumePrompt(repoInfo, formattedFiles);
    
    if (onProgress) {
      onProgress({ type: 'calling', message: 'Calling Hugging Face API...' });
    }
    
    // Call Hugging Face API (free)
    // API key is required for authentication
    // Separate context tokens (input) from generation tokens (output)
    const apiOptions = {
      ...options,
      maxGenerationTokens: options.maxGenerationTokens || options.maxTokens || 2000
    };
    const apiResult = await callHuggingFace(apiKey, prompt, apiOptions);
    
    // Extract content and token usage
    const resumePoints = apiResult.content;
    const tokenUsage = apiResult.usage;
    
    if (onProgress) {
      onProgress({ type: 'complete', message: 'Resume points generated successfully!' });
    }
    
    return {
      resumePoints,
      stats: {
        totalFiles: prepared.totalFiles,
        processedFiles: prepared.processedFiles,
        truncated: prepared.truncated,
        provider: 'huggingface',
        model: options.model || 'Qwen/Qwen2.5-7B-Instruct',
        // Token usage: separate context (input) from generation (output)
        tokens: {
          context: tokenUsage.prompt_tokens,      // Input/context tokens
          generation: tokenUsage.completion_tokens,  // Output/generation tokens
          total: tokenUsage.total_tokens
        },
        maxContextTokens: maxContextTokens,
        maxGenerationTokens: apiOptions.maxGenerationTokens
      }
    };
  } catch (error) {
    if (onProgress) {
      onProgress({ type: 'error', message: error.message });
    }
    throw error;
  }
}

// Export functions globally
window.LLMAPI = {
  generateResumePoints,
  prepareFilesForLLM,
  formatFilesForPrompt,
  createResumePrompt,
  callHuggingFace
};

