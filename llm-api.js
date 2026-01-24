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
 * @param {string|null} jobDescription - Optional job description for customization
 */

function createResumePrompt(repoInfo, formattedFiles, jobDescription = null) {
  let jobDescriptionSection = '';
  if (jobDescription && jobDescription.trim()) {
    jobDescriptionSection = `
**JOB DESCRIPTION (USE FOR EMPHASIS, NOT FABRICATION):**
${jobDescription}

IMPORTANT:
- Use the job description ONLY to decide what to emphasize or reword.
- Do NOT invent skills, metrics, performance claims, or experience not supported by the repository.
- If the repo does not contain something mentioned in the job description, do not claim it.
`;
  }

  return `You are an expert resume writer and technical recruiter. Generate ATS-friendly resume bullet points using ONLY evidence found in the repository code/content provided below.

Repository: ${repoInfo.owner}/${repoInfo.repo}
${jobDescriptionSection}
Goal:
Create 3–6 ATS-friendly resume bullets that summarize what was built, how it was built, and concrete scope/complexity — without inventing performance or business impact.

Hard rules (must follow):
1) Only claim facts that are directly supported by the provided repository code/text.
2) You MAY include numbers ONLY if you can derive them from the repo content, such as:
   - counts of files/modules/components
   - number of API endpoints/routes/controllers/handlers
   - number of classes/functions/services
   - number of tests/test files/test cases
   - number of database tables/models/migrations
   - number of CLI commands/jobs/workers
   - number of integrations found in code
   - lines-of-code estimate ONLY if explicitly present (otherwise do not guess)
3) Do NOT fabricate any of these unless explicitly stated in code/docs/readme:
   - request/sec, latency, throughput, uptime, user counts, revenue, cost savings, % improvements
4) If you cannot confidently extract a number for a bullet, rewrite that bullet to focus on architecture/technique and omit numeric claims (numbers are optional, accuracy is mandatory).

What to analyze from the repo:
- Tech stack (languages, frameworks, libraries, infrastructure)
- Core features and major workflows
- Architecture patterns (MVC, Clean Architecture, layered services, CQRS, etc.)
- Data layer (ORM/models/migrations/schemas)
- APIs (routes/endpoints, auth, validation, error handling)
- Background jobs/queues, integrations, CI/CD, containerization
- Testing approach (unit/integration/e2e) and what exists in the repo

Output requirements:
- Provide 3–6 bullet points.
- Each bullet starts with a strong action verb.
- Each bullet must mention relevant technologies from the repo.
- Use concrete, repo-verifiable scope/complexity signals ONLY when extractable.
- Keep each bullet 1–2 lines, ATS-friendly, no fluff.

Verification step (internal, do NOT show):
- Extract an “Evidence Summary” of:
  - frameworks/languages used
  - route/endpoint count (if identifiable)
  - test count (if identifiable)
  - modules/services/components count (if identifiable)
Then write bullets strictly based on that evidence.

Final output format:
• <bullet 1>
• <bullet 2>
• <bullet 3>
(etc.)

Repository Code (verbatim excerpts / file listings):
${formattedFiles}

Now generate the ATS-friendly resume bullet points based strictly on the repository evidence, while emphasizing alignment with the job description where applicable.`;
}


/**
 * Call backend proxy to generate resume points
 * @param {string} apiKey - No longer used, kept for compatibility
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options (repoInfo, jobDescription, etc.)
 * @returns {Promise<Object>} Object with content and token usage { content: string, usage: { prompt_tokens, completion_tokens, total_tokens } }
 */
async function callHuggingFace(apiKey, prompt, options = {}) {
  // Backend URL - production deployment
  const BACKEND_URL = 'https://codebrief-backend.onrender.com';
  
  // Extract repoInfo and jobDescription from options
  const repoInfo = options.repoInfo || { owner: '', repo: '', url: '' };
  const jobDescription = options.jobDescription || null;
  
  try {
    const requestBody = {
      repoInfo: repoInfo,
      formattedPrompt: prompt
    };
    
    // Include job description if provided
    if (jobDescription) {
      requestBody.jobDescription = jobDescription;
    }
    
    const response = await fetch(`${BACKEND_URL}/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText;
      }
      
      // Handle specific status codes
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable. The model may be loading. Please try again in 10-20 seconds.');
      }
      if (response.status === 504) {
        throw new Error('Request timed out. Please try again.');
      }
      if (response.status === 502) {
        throw new Error('Backend service error. Please try again later.');
      }
      
      throw new Error(`Backend error (${response.status}): ${errorMessage}`);
    }
    
    const data = await response.json();
    
    // Return in the same format as before for compatibility
    return {
      content: data.resumePoints || '',
      usage: {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null
      }
    };
  } catch (error) {
    console.error('Backend API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Backend API error: ${String(error)}`);
  }
}

/**
 * Main function to generate resume points from repository files
 * Uses backend proxy to call Hugging Face API (backend handles authentication)
 * @param {string} provider - LLM provider (always 'huggingface')
 * @param {string} apiKey - No longer used, kept for compatibility
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
    
    // Get job description from options
    const jobDescription = options.jobDescription || null;
    
    // Create prompt (with job description if provided)
    const prompt = createResumePrompt(repoInfo, formattedFiles, jobDescription);
    
    if (onProgress) {
      onProgress({ type: 'calling', message: 'Calling backend API...' });
    }
    
    // Call backend proxy (API key no longer needed - backend handles authentication)
    // Separate context tokens (input) from generation tokens (output)
    const apiOptions = {
      ...options,
      repoInfo: repoInfo,  // Pass repoInfo to the backend
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

