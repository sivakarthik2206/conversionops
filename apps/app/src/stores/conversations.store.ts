import { create } from 'zustand';

interface Conversation {
  id: string;
  leadId: string;
  status: string;
  aiActive: boolean;
  updatedAt: string;
}

interface ConversationsStore {
  activeConversationId: string | null;
  conversations: Conversation[];
  setActiveConversationId: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (id: string, patch: Partial<Conversation>) => void;
}

export const useConversationsStore = create<ConversationsStore>((set) => ({
  activeConversationId: null,
  conversations: [],
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (id, patch) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    })),
}));
