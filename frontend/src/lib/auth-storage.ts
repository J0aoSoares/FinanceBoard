const REFRESH_TOKEN_KEY = 'financeboard.refreshToken';

let accessToken: string | null = null;

const sessionExpiredListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(tokens: {
  accessToken: string;
  refreshToken: string;
}): void {
  accessToken = tokens.accessToken;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    return;
  }
}

export function clearSession(): void {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    return;
  }
}

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function emitSessionExpired(): void {
  for (const listener of sessionExpiredListeners) {
    listener();
  }
}
