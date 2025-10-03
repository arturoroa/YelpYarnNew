/**
 * API utility functions for making requests to the backend
 */

// Base API URL - IMPORTANT: removed the /api prefix since it's added in component calls
const API_BASE_URL = '';  // Changed from '/api' to empty string

/**
 * Generic function to make GET requests to the API
 * @param endpoint The API endpoint to call (without the base URL)
 * @returns Promise resolving to the requested data
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Generic function to make POST requests to the API
 * @param endpoint The API endpoint to call (without the base URL)
 * @param data The data to send in the request body
 * @returns Promise resolving to the response data
 */
export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Generic function to make PUT requests to the API
 * @param endpoint The API endpoint to call (without the base URL)
 * @param data The data to send in the request body
 * @returns Promise resolving to the response data
 */
export async function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Generic function to make DELETE requests to the API
 * @param endpoint The API endpoint to call (without the base URL)
 * @returns Promise resolving to the response data
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
}