// src/shared/api/hooks.ts
import { useState, useEffect, useCallback } from 'react';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';
import axios from 'axios';
import { apiConfig } from '../utils/api_config';
import type { ApiError } from '../utils/shared-types';

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
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedQueue, setFailedQueue] = useState<
    Array<{
      resolve: (token: string) => void;
      reject: (error: ApiError) => void;
    }>
  >([]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    return new Promise(resolve => {
      const urlPattern = `${apiConfig.baseURL}/*`;
      chrome.tabs.query(
        {
          url: urlPattern,
        },
        tabs => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[tabs.length - 1].id!, { type: 'GET_AUTH_TOKEN' }, response => {
              console.log('got response object:', response);
              resolve(response?.token || null);
            });
          } else {
            console.log('no matching tabs', tabs);
            resolve(null);
          }
        },
      );
    });
  }, []);

  const promptLogin = useCallback(async (): Promise<void> => {
    const loginUrl = `${apiConfig.baseURL}/login`;
    console.log('promptLogin', loginUrl);
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

  const validateToken = useCallback(async (instance: AxiosInstance) => {
    try {
      console.log('validateToken');
      await instance.get('/api/v1/whoami');
      setIsReady(true);
    } catch (error) {
      setIsReady(false);
      // The 401 interceptor will handle the promptLogin if needed
    }
  }, []);

  useEffect(() => {
    const initializeClient = async () => {
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
          console.log('status', status);

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
              console.log('promptLogin');
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

      // Validate token on initialization
      const token = await getAuthToken();
      if (token) {
        await validateToken(instance);
      } else {
        await promptLogin();
      }
    };

    void initializeClient();
    console.log(process.env.NODE_ENV, process.env.__DEV__);
  }, [validateToken, getAuthToken]);

  return {
    client: axiosInstance,
    isReady,
  };
}
