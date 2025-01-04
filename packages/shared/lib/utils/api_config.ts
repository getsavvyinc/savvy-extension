import type { ApiConfig } from './shared-types';

export const apiConfig: ApiConfig = {
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://app.getsavvy.so',
  tokenKey: '',
};
