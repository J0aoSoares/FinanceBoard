import {
  clearSession,
  emitSessionExpired,
  getAccessToken,
  getRefreshToken,
  setSession,
} from './auth-storage';

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(' ') || 'Erro inesperado na API');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function extractMessages(payload: unknown, status: number): string[] {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload as { message: unknown };
    if (Array.isArray(message)) {
      return message.map(String);
    }
    if (typeof message === 'string' && message !== '') {
      return [message];
    }
  }
  return [`A API respondeu com erro ${status}`];
}

async function parseError(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    extractMessages(payload, response.status),
  );
}

interface RequestOptions {
  method?: string;
  params?: QueryParams;
  body?: unknown;
  skipAuth?: boolean;
}

async function send(
  path: string,
  { method = 'GET', params, body, skipAuth }: RequestOptions,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  try {
    return await fetch(buildUrl(path, params), {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, [
      'Não foi possível falar com a API. Verifique se o backend está no ar.',
    ]);
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

let refreshInFlight: Promise<void> | null = null;

async function performRefresh(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new ApiError(401, ['Sessão expirada']);
  }

  const pair = await request<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    { method: 'POST', body: { refreshToken }, skipAuth: true },
  );

  setSession(pair);
}

export function ensureRefreshed(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, options);

  if (response.status !== 401 || options.skipAuth || !getRefreshToken()) {
    return handle<T>(response);
  }

  try {
    await ensureRefreshed();
  } catch {
    clearSession();
    emitSessionExpired();
    throw await parseError(response);
  }

  return handle<T>(await send(path, options));
}
