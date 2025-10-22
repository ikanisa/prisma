import { create } from 'zustand';
import { clientEnv } from '@/src/env.client';

export type OrgContext = {
  orgSlug: string | null;
  engagementId: string | null;
  userId: string | null;
};

type AppState = OrgContext & {
  setOrgSlug: (orgSlug: string | null) => void;
  setEngagementId: (engagementId: string | null) => void;
  setUserId: (userId: string | null) => void;
};

const initialState: OrgContext = {
  orgSlug: clientEnv.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo',
  engagementId: clientEnv.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID ?? null,
  userId: clientEnv.NEXT_PUBLIC_DEMO_USER_ID ?? null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setOrgSlug: (orgSlug) => set({ orgSlug }),
  setEngagementId: (engagementId) => set({ engagementId }),
  setUserId: (userId) => set({ userId }),
}));
