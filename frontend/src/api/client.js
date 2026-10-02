// Central API Client with Token Management, Refresh Handling, & Normalized Error Responses

const DEFAULT_BACKEND_URL = 'https://rainbow-packaging-1.onrender.com/api/v1';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app') ? DEFAULT_BACKEND_URL : '/api/v1');

// Token storage helpers
export const getAccessToken = () => localStorage.getItem('rp_access_token');
export const getRefreshToken = () => localStorage.getItem('rp_refresh_token');

export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem('rp_access_token', accessToken);
  if (refreshToken) localStorage.setItem('rp_refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('rp_access_token');
  localStorage.removeItem('rp_refresh_token');
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Custom fetch wrapper for standardized API requests
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized and not already performing refresh/login request
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          throw new ApiError('Authentication required. Please log in.', 'UNAUTHORIZED', 401);
        }

        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const refreshData = await refreshRes.json();

          if (refreshRes.ok && refreshData.success && refreshData.data?.access_token) {
            const newAccessToken = refreshData.data.access_token;
            const newRefreshToken = refreshData.data.refresh_token || refreshToken;
            setTokens(newAccessToken, newRefreshToken);
            
            processQueue(null, newAccessToken);
            isRefreshing = false;

            // Retry original request with new token
            config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, config);
          } else {
            throw new Error('Refresh token invalid');
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          throw new ApiError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
        }
      } else {
        // Queue pending request while token is being refreshed
        const retryToken = await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        config.headers['Authorization'] = `Bearer ${retryToken}`;
        response = await fetch(url, config);
      }
    }

    let data = {};
    const responseText = await response.text();
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (_e) {
        data = { message: responseText || `HTTP Error ${response.status}` };
      }
    }

    if (!response.ok || data.success === false) {
      const errMessage = data.error?.message || data.message || `Request failed with status ${response.status}`;
      const errCode = data.error?.code || 'API_ERROR';
      const errDetails = data.error?.details || null;
      throw new ApiError(errMessage, errCode, response.status, errDetails);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
