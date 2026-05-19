'use client';

import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useRealtime } from './useRealtime';
import type { MessageNewEvent, ConversationTakeoverEvent } from './useRealtime';

export interface ConversationSummary {
  id: string;
  workspaceId: string;
  leadId: string;
  channel: string;
  status: string;
  aiActive: boolean;
  takenOverBy: string | null;
  escalationLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  workspaceId: string;
  conversationId: string;
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  aiMetadata: unknown;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[];
}

interface ConversationPage {
  items: ConversationSummary[];
  nextCursor: string | null;
}

export interface ConversationFilters {
  status?: string;
  aiActive?: boolean;
  limit?: number;
}

export function useConversations(filters?: ConversationFilters) {
  const queryClient = useQueryClient();
  const { on } = useRealtime();

  const query = useInfiniteQuery({
    queryKey: ['conversations', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<ConversationPage>('/conversations', {
        ...filters,
        cursor: pageParam as string | undefined,
        limit: filters?.limit ?? 25,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ConversationPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    const offMessage = on('message:new', (event: MessageNewEvent) => {
      queryClient.setQueryData(
        ['conversations', filters],
        (old: { pages: ConversationPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: ConversationPage, i: number) =>
              i === 0
                ? {
                    ...page,
                    items: page.items.map((c: ConversationSummary) =>
                      c.id === event.conversationId
                        ? { ...c, updatedAt: event.createdAt }
                        : c,
                    ),
                  }
                : page,
            ),
          };
        },
      );
    });

    const offTakeover = on('conversation:takeover', (event: ConversationTakeoverEvent) => {
      queryClient.setQueryData(
        ['conversations', filters],
        (old: { pages: ConversationPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: ConversationPage) => ({
              ...page,
              items: page.items.map((c: ConversationSummary) =>
                c.id === event.conversationId
                  ? { ...c, status: 'HUMAN_ACTIVE', aiActive: false, takenOverBy: event.takenOverBy }
                  : c,
              ),
            })),
          };
        },
      );
    });

    return () => {
      offMessage();
      offTakeover();
    };
  }, [on, queryClient, filters]);

  const conversations = query.data?.pages.flatMap((p: ConversationPage) => p.items) ?? [];

  return {
    conversations,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useConversation(id: string) {
  const queryClient = useQueryClient();
  const { on, joinConversation } = useRealtime();

  const query = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiClient.get<ConversationDetail>(`/conversations/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    joinConversation(id);
  }, [id, joinConversation]);

  useEffect(() => {
    const off = on('message:new', (event: MessageNewEvent) => {
      if (event.conversationId !== id) return;
      queryClient.setQueryData(['conversation', id], (old: ConversationDetail | undefined) => {
        if (!old) return old;
        const newMessage: Message = {
          id: event.messageId,
          workspaceId: old.workspaceId,
          conversationId: id,
          role: event.role,
          content: event.content,
          aiMetadata: null,
          createdAt: event.createdAt,
        };
        return { ...old, messages: [...old.messages, newMessage] };
      });
    });
    return off;
  }, [on, id, queryClient]);

  return {
    conversation: query.data ?? null,
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading,
  };
}
