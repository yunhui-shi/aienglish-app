// src/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Default to FastAPI port

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown; // Can be any type, will be JSON.stringified for relevant methods
  token?: string | null;
  params?: Record<string, string | number | boolean | string[]>; // For query parameters
}

async function apiCall<T>(endpoint: string, options: ApiCallOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, token, params } = options; // Added params here

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    config.headers = { ...config.headers, 'Authorization': `Bearer ${token}` };
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const queryParams = new URLSearchParams();
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  const response = await fetch(url, config); // Use the potentially modified url

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch { // _e is not used in this block
      // If response is not JSON, use text
      errorData = { detail: await response.text() };
    }
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      // Clear token from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    
    console.error('API Error:', response.status, errorData);
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  // For DELETE requests or other methods that might not return JSON content (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T; // Or handle as appropriate, e.g., return null or a specific success object
  }

  return response.json() as Promise<T>;
}

export default apiCall;

// Define the expected structure of a practice question from the API
// This should align with the PracticeQuestion interface in practice/page.tsx
export interface ApiPracticeQuestion {
  id: string;
  sentence_id?: number;
  question_text?: string;        
  options?: string[];            
  correct_answer?: string;       
  explanation?: string;          
  translation_text?: string;     
  translation_options?: string[];
  correct_translation?: string;  
  difficulty?: string;
  knowledge_point?: string;
  // Add any other fields returned by the backend
}

/**
 * Fetches a practice question from the backend.
 * @param topic The topic of the question. Optional.
 * @param difficulty The difficulty of the question. Optional.
 * @param token The auth token. Optional.
 * @returns A promise that resolves to the practice question.
 */
export const 
getPracticeQuestion = (topic?: string, difficulty?: string, token?: string | null) => {
  const params: Record<string, string> = {};
  if (topic && topic !== 'general') { // Assuming 'general' means no specific topic filter
    params.topic = topic;
  }
  if (difficulty) {
    params.difficulty = difficulty;
  }
  return apiCall<ApiPracticeQuestion>('/practice/set/new', { params, token });
};

// Define the structure for submitting an answer
// This should align with schemas.UserAnswerCreate in the backend
export interface UserAnswerPayload {
  question_id: string;
  selected_word_answer?: string;
  selected_translation_answer?: string;
  // is_correct and answered_at can be set by the backend
  // or if your backend expects them, add them here.
}

/**
 * Submits a user's answer(s) to the backend.
 * @param answers An array of user answer payloads.
 * @param token The auth token.
 * @returns A promise that resolves to the backend's response (e.g., evaluated answers).
 */
export const submitUserAnswer = (answers: UserAnswerPayload[], token: string | null) => {
  return apiCall<unknown>('/practice/set/submit', { // Replace 'unknown' with the actual response type if known
    method: 'POST',
    body: answers,
    token,
  });
};

export async function initializeCachePool(token: string): Promise<void> {
  await apiCall<void>('/practice/cache/initialize', { method: 'POST', token });
}

export interface WordDefinition {
  part_of_speech: string;
  meanings: string[];
}

export interface WordExplanation {
  word: string;
  phonetic?: string;
  definitions: WordDefinition[];
}

export async function getWordExplanation(word: string, token: string | null): Promise<WordExplanation> {
  return apiCall<WordExplanation>(`/vocab/word/${encodeURIComponent(word)}/explanation`, { 
    method: 'GET', 
    token 
  });
}

// Example usage (will be expanded with specific service functions):
// export const getPracticeSet = () => apiCall<PracticeSetType>('/practice/set/new');
// export const loginUser = (credentials: LoginCredentials) => apiCall<AuthToken>('/auth/login/token', { method: 'POST', body: credentials });