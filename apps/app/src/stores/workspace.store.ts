import { create } from 'zustand';

interface WorkspaceUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  aiPaused: boolean;
  tokenUsageCurrentMonth: number;
  tokenQuotaMonthly: number;
}

interface WorkspaceStore {
  workspace: Workspace | null;
  user: WorkspaceUser | null;
  setWorkspace: (workspace: Workspace | null) => void;
  setUser: (user: WorkspaceUser | null) => void;
  updateWorkspace: (patch: Partial<Workspace>) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspace: null,
  user: null,
  setWorkspace: (workspace) => set({ workspace }),
  setUser: (user) => set({ user }),
  updateWorkspace: (patch) =>
    set((state) => ({
      workspace: state.workspace ? { ...state.workspace, ...patch } : null,
    })),
}));
