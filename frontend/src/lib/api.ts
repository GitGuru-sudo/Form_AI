import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

/** Turn any axios failure into a short, user-facing sentence. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ message?: string }>;
    if (ax.code === 'ERR_NETWORK') {
      return 'Network error. Check your connection and try again.';
    }
    if (ax.code === 'ECONNABORTED' || ax.code === 'ERR_CANCELED') {
      return 'The request timed out. Please try again.';
    }
    const status = ax.response?.status;
    const serverMsg = ax.response?.data?.message;
    if (serverMsg) return serverMsg;
    if (status === 401) return 'Your session expired. Please sign in again.';
    if (status === 403) return 'You do not have access to do that.';
    if (status === 404) return 'We could not find what you were looking for.';
    if (status === 429) return 'Too many requests. Please slow down and try again.';
    if (status && status >= 500) return 'The server ran into a problem. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

// Canceled requests (AbortController / timeouts) are control flow, not failures
// the user needs to see surfaced — let them through untouched so call sites can
// branch on err.name (see dashboard generate flow).
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const isCanceled =
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError' ||
      error.name === 'AbortError';
    if (!isCanceled) {
      // Attach a normalized message; call sites read it for toast.error(...).
      (error as AxiosError & { userMessage?: string }).userMessage =
        getErrorMessage(error);
      if (process.env.NODE_ENV !== 'production') {
        console.error('[api]', error.config?.method, error.config?.url, error.response?.status);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
