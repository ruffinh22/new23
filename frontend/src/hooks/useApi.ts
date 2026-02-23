/**
 * useApi Hook
 * Hook générique pour les appels API
 */

import { useState, useCallback, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { REQUEST_TIMEOUT, ERROR_MESSAGES } from '../utils/constants';

interface UseApiOptions {
  autoFetch?: boolean;
  headers?: Record<string, string>;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useApi = <T,>(
  url: string,
  options: UseApiOptions = {}
): UseApiResult<T> => {
  const { autoFetch = false, headers } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<T>(url, {
        headers,
        timeout: REQUEST_TIMEOUT,
      });
      setData(response.data);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [url, headers]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Get error message from axios error
 */
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 401) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (axiosError.response?.status === 403) {
      return ERROR_MESSAGES.FORBIDDEN;
    }
    if (axiosError.response?.status === 404) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    if (axiosError.response?.status === 422 || axiosError.response?.status === 400) {
      return ERROR_MESSAGES.VALIDATION_ERROR;
    }
    if (axiosError.response && axiosError.response.status >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    if (axiosError.message === 'Network Error') {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    const responseData = axiosError.response?.data as Record<string, any> || {};
    return (
      responseData.detail ||
      responseData.message ||
      axiosError.message ||
      ERROR_MESSAGES.SERVER_ERROR
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGES.SERVER_ERROR;
};
