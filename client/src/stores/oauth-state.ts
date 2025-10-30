import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OAuthState = {
  isSystem: boolean
  credentialsData?: any
  timestamp: number
  integrationType: string
}

type OAuthStore = {
  oauthState: OAuthState | null
  oauthWindow: Window | null
  oauthCompleted: {
    integrationId: string
    success: boolean
    message: string
  } | null
  setOauthState: (state: OAuthState | null) => void
  setOauthWindow: (window: Window | null) => void
  setOauthCompleted: (
    completed: { integrationId: string; success: boolean; message: string } | null,
  ) => void
  clearOAuth: () => void
}

export const useOAuthStore = create<OAuthStore>()(
  persist(
    (set) => ({
      oauthState: null,
      oauthWindow: null,
      oauthCompleted: null,
      setOauthState: (state) => set({ oauthState: state }),
      setOauthWindow: (window) => set({ oauthWindow: window }),
      setOauthCompleted: (completed) => set({ oauthCompleted: completed }),
      clearOAuth: () => set({ oauthState: null, oauthWindow: null, oauthCompleted: null }),
    }),
    {
      name: 'oauth-storage',
      // Only persist the oauth state, not the window reference
      partialize: (state) => ({
        oauthState: state.oauthState,
        oauthCompleted: state.oauthCompleted,
      }),
    },
  ),
)
