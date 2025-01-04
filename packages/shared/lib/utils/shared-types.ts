export type ValueOf<T> = T[keyof T];

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface ApiConfig {
  baseURL: string;
  tokenKey: string;
}
