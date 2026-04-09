import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let clerkToken: string | null = null;

export function setApiToken(token: string | null): void {
  clerkToken = token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (clerkToken) {
    config.headers['Authorization'] = `Bearer ${clerkToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);
