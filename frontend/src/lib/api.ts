/**
 * Centralized API configuration for AgentLens frontend.
 * 
 * In local development, VITE_API_BASE_URL is usually undefined,
 * which means requests default to relative paths (e.g. `/api/...`)
 * and get caught by the Vite development proxy.
 * 
 * In production (e.g. Cloudflare Pages), VITE_API_BASE_URL should
 * point to the absolute URL of the deployed backend (e.g. `https://api.agentlens.io`).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Wrapper for standard fetch that automatically prefixes the API_BASE_URL.
 */
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${API_BASE_URL}${normalizedEndpoint}`, options);
};
