import type { ApiConfig } from './shared-types';

const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export const apiConfig: ApiConfig = {
  baseURL: isDevelopment ? 'http://localhost:5173' : 'https://app.getsavvy.so',
  tokenKey: '',
};
