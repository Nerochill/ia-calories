import { useAuth } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    /** The server's error message; only sent in development. */
    readonly detail?: string
  ) {
    super(`API request failed (${status}${code ? ` ${code}` : ''})${detail ? `: ${detail}` : ''}`);
  }
}

/** The path without its query string, so logs group by endpoint rather than by date or id. */
const endpointOf = (path: string) => path.split('?')[0];

type RequestOptions ={ method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown };

/**
 * Returns a fetcher for our API routes that sends the Clerk session token.
 * Relative paths resolve to the dev server in development (also on a physical device);
 * production native builds need the expo-router plugin's `origin` set to the deployed API.
 */
export function useApi() {
  const { getToken } = useAuth();

  return async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const token = await getToken();

    let res: Response;
    try {
      res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      console.error(`[api] ${method} ${path} could not reach the server:`, err);
      Sentry.logger.warn('API request unreachable', {
        endpoint: endpointOf(path),
        method,
        error_message: String(err),
      });
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new ApiError(res.status, data?.error, data?.message);
      console.error(`[api] ${method} ${path}: ${error.message}`);
      // 4xx is usually expected (validation, scan limit); 5xx means the server broke.
      Sentry.logger[res.status >= 500 ? 'error' : 'warn']('API request failed', {
        endpoint: endpointOf(path),
        method,
        status: res.status,
        error_code: data?.error ?? 'unknown',
      });
      throw error;
    }
    return data as T;
  };
}
