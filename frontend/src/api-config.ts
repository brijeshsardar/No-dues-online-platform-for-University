/// <reference types="vite/client" />

// Global API Configuration:
// If VITE_API_URL is configured (e.g. in Vercel environment variables pointing to deployed backend),
// intercept relative /api calls and route them to that backend URL.
// When unset (default in local dev), Vite dev proxy handles /api -> http://localhost:5000.
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;

if (API_BASE_URL && typeof window !== 'undefined') {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(`${cleanBase}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

export { API_BASE_URL };
