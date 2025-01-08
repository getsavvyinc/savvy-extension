// src/shared/api/hooks.ts
import { useState, useEffect, useCallback } from 'react';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';
import axios from 'axios';
import { apiConfig } from '@lib/utils/api_config';
import type { ApiError } from '@lib/utils/shared-types';

interface ApiHookResult {
  client: AxiosInstance | null;
  isReady: boolean;
}

// Add custom property to AxiosRequestConfig
export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  // Add other potential error response fields here
}

export function useApiClient(): ApiHookResult {
  const [axiosInstance, setAxiosInstance] = useState<AxiosInstance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedQueue, setFailedQueue] = useState<
    Array<{
      resolve: (token: string) => void;
      reject: (error: ApiError) => void;
    }>
  >([]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    return new Promise(resolve => {
      chrome.tabs.query(
        {
          url: ['https://app.getsavvy.so/*', 'http://localhost:5173/*'],
        },
        tabs => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id!, { type: 'GET_AUTH_TOKEN' }, response =>
              resolve(response?.token || null),
            );
          } else {
            resolve(null);
          }
        },
      );
    });
  }, []);

  const promptLogin = useCallback(async (): Promise<void> => {
    const loginUrl = `${apiConfig.baseURL}/login`;
    await chrome.tabs.create({ url: loginUrl });
  }, []);

  const processQueue = useCallback(
    (error: ApiError | null = null): void => {
      failedQueue.forEach(promise => {
        if (error) {
          promise.reject(error);
        } else {
          promise.resolve(axiosInstance?.defaults.headers.common['Authorization']?.toString() || '');
        }
      });
      setFailedQueue([]);
    },
    [failedQueue, axiosInstance],
  );

  useEffect(() => {
    const initializeClient = () => {
      const instance = axios.create({
        baseURL: apiConfig.baseURL,
      });

      instance.interceptors.request.use(
        async config => {
          if (!config.headers.Authorization) {
            const token = await getAuthToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
          return config;
        },
        error => Promise.reject(error),
      );

      instance.interceptors.response.use(
        response => response.data,
        // TODO: check the json returned by the server and update fields
        async (error: AxiosError<ApiErrorResponse>) => {
          const originalRequest = error.config! as ExtendedAxiosRequestConfig;
          const status = error.response?.status;

          if (status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
              return new Promise<AxiosHeaderValue>((resolve, reject) => {
                setFailedQueue(prev => [...prev, { resolve, reject }]);
              })
                .then(token => {
                  originalRequest.headers.Authorization = token;
                  return instance(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            setIsRefreshing(true);
            originalRequest._retry = true;

            try {
              await promptLogin();
              const newToken = await getAuthToken();

              if (!newToken) {
                throw new Error('No token after login');
              }

              instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;

              processQueue();
              return instance(originalRequest);
            } catch (refreshError) {
              processQueue(refreshError as ApiError);
              return Promise.reject(refreshError);
            } finally {
              setIsRefreshing(false);
            }
          }

          const apiError: ApiError = {
            status: status || 500,
            message: error.response?.data?.message || 'An unexpected error occurred',
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };

          return Promise.reject(apiError);
        },
      );

      setAxiosInstance(instance);
    };

    initializeClient();
  }, [isRefreshing, processQueue]);

  return {
    client: axiosInstance,
    isReady: !!axiosInstance,
  };
}
