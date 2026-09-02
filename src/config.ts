// frontend/src/config.ts
const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();

export const API_BASE_URL = rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1')
    ? (rawApiUrl.startsWith('http') ? rawApiUrl : `http://${rawApiUrl}`).replace(/\/+$/, "")
    : (rawApiUrl.startsWith('http') ? rawApiUrl.replace(/^http:\/\//i, 'https://') : `https://${rawApiUrl}`).replace(/\/+$/, "");
