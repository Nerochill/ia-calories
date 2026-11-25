import { create } from 'zustand';

/** Whether a Clerk SSO browser flow is running, shared with the `/sso-callback` route. */
export const useSSOFlowStore = create<{ inProgress: boolean }>(() => ({ inProgress: false }));
