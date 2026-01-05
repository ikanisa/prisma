/**
 * OpenAI Apps SDK State Management
 * 
 * Manages application state for OpenAI ChatGPT App Store integration
 * 
 * Note: This is a lightweight state management solution.
 * For React components, consider using React Context or a state management library.
 */

export interface OpenAIAppState {
  sessionId: string | null;
  userId: string | null;
  workspaceId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
  lastSyncAt: number | null;
}

export interface OpenAIAppActions {
  setSession: (sessionId: string, userId: string) => void;
  setWorkspace: (workspaceId: string) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  updateMetadata: (metadata: Record<string, unknown>) => void;
  sync: () => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  getState: () => OpenAIAppState;
}

const initialState: OpenAIAppState = {
  sessionId: null,
  userId: null,
  workspaceId: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  metadata: {},
  lastSyncAt: null,
};

// Simple in-memory store implementation
let appState: OpenAIAppState = { ...initialState };

export const openAIAppStore: OpenAIAppActions = {
  setSession: (sessionId: string, userId: string) => {
    appState = { ...appState, sessionId, userId };
  },

  setWorkspace: (workspaceId: string) => {
    appState = { ...appState, workspaceId };
  },

  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    appState = { ...appState, accessToken, refreshToken, expiresAt };
  },

  updateMetadata: (metadata: Record<string, unknown>) => {
    appState = {
      ...appState,
      metadata: { ...appState.metadata, ...metadata },
    };
  },

  sync: () => {
    appState = { ...appState, lastSyncAt: Date.now() };
  },

  clear: () => {
    appState = { ...initialState };
  },

  isAuthenticated: () => {
    return !!appState.sessionId && !!appState.userId && !!appState.accessToken;
  },

  isTokenExpired: () => {
    if (!appState.expiresAt) return true;
    return Date.now() >= appState.expiresAt;
  },

  getState: () => {
    return { ...appState };
  },
};

/**
 * Get authenticated headers for OpenAI App API calls
 */
export function getAuthenticatedHeaders(): HeadersInit {
  const state = openAIAppStore.getState();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (state.accessToken && !openAIAppStore.isTokenExpired()) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  }

  if (state.sessionId) {
    headers['X-Session-ID'] = state.sessionId;
  }

  if (state.workspaceId) {
    headers['X-Workspace-ID'] = state.workspaceId;
  }

  return headers;
}

/**
 * Check if OpenAI App integration is enabled
 */
export function isOpenAIAppEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OPENAI_APP_ENABLED === 'true';
}