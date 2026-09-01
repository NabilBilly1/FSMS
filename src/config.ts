// frontend/src/config.ts
const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();

export const API_BASE_URL = rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1')
    ? rawApiUrl.replace(/\/+$/, "") // Keep as-is for local
    : rawApiUrl.replace(/^http:\/\//i, 'https://').replace(/\/+$/, ""); // Force https for production
