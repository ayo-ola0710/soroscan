/**
 * JWT Token Management Utility
 * 
 * Handles storage, retrieval, and refreshing of access and refresh tokens.
 * Enforces strict typing and avoids usage of 'any'.
 */

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Retrieves the current access token from local storage.
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Retrieves the current refresh token from local storage.
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Saves tokens to local storage.
 */
export const setTokens = (tokens: Tokens): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
};

/**
 * Clears all authentication tokens from local storage.
 */
export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Checks if the user is currently logged in based on the presence of an access token.
 */
export const isLoggedIn = (): boolean => {
  return !!getAccessToken();
};

/**
 * Refreshes the access token using the refresh token.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/token/refresh/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      }
    );

    if (response.ok) {
      const data: Tokens = await response.json();
      setTokens(data);
      return data.access;
    } else {
      // If refresh fails, clear tokens as they are likely invalid/expired
      clearTokens();
    }
  } catch (error) {
    console.error('Failed to refresh access token:', error);
  }
  
  return null;
};
