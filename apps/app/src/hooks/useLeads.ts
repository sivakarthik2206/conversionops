'use client';

import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useRealtime } from './useRealtime';
import type { LeadCreatedEvent, LeadScoredEvent, LeadAssignedEvent } from './useRealtime';

export interface Lead {
  id: string;
  workspaceId: string;
  source: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  tier: string;
  score: number;
  assignedWorkspaceUserId: string | null;
  qualification: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _animate?: boolean;
}

interface LeadPage {
  items: Lead[];
  nextCursor: string | null;
}

export interface LeadFilters {
  status?: string;
  tier?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
  limit?: number;
}

export function useLeads(filters?: LeadFilters) {
  const queryClient = useQueryClient();
  const { on } = useRealtime();

  const query = useInfiniteQuery({
    queryKey: ['leads', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get<LeadPage>('/leads', {
        ...filters,
        cursor: pageParam as string | undefined,
        limit: filters?.limit ?? 25,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: LeadPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    const offCreated = on('lead:created', (event: LeadCreatedEvent) => {
      queryClient.setQueryData(
        ['leads', filters],
        (old: { pages: LeadPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const newLead: Lead = {
            id: event.leadId,
            workspaceId: event.workspaceId,
            source: event.source,
            name: null,
            phone: null,
            email: null,
            status: 'NEW',
            tier: 'UNQUALIFIED',
            score: 0,
            assignedWorkspaceUserId: null,
            qualification: {},
            createdAt: event.createdAt,
            updatedAt: event.createdAt,
            _animate: true,
          };
          return {
            ...old,
            pages: [
              { ...old.pages[0], items: [newLead, ...(old.pages[0]?.items ?? [])] },
              ...old.pages.slice(1),
            ],
          };
        },
      );
    });

    const offScored = on('lead:scored', (event: LeadScoredEvent) => {
      queryClient.setQueryData(
        ['leads', filters],
        (old: { pages: LeadPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: LeadPage) => ({
              ...page,
              items: page.items.map((lead: Lead) =>
                lead.id === event.leadId
                  ? { ...lead, score: event.score, tier: event.tier }
                  : lead,
              ),
            })),
          };
        },
      );
    });

    const offAssigned = on('lead:assigned', (event: LeadAssignedEvent) => {
      queryClient.setQueryData(
        ['leads', filters],
        (old: { pages: LeadPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: LeadPage) => ({
              ...page,
              items: page.items.map((lead: Lead) =>
                lead.id === event.leadId
                  ? { ...lead, assignedWorkspaceUserId: event.workspaceUserId }
                  : lead,
              ),
            })),
          };
        },
      );
    });

    return () => {
      offCreated();
      offScored();
      offAssigned();
    };
  }, [on, queryClient, filters]);

  const leads = query.data?.pages.flatMap((p: LeadPage) => p.items) ?? [];

  return {
    leads,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
  };
}

export function useLead(id: string) {
  const query = useQuery({
    queryKey: ['lead', id],
    queryFn: () => apiClient.get<Lead>(`/leads/${id}`),
    enabled: !!id,
  });

  return {
    lead: query.data ?? null,
    isLoading: query.isLoading,
  };
}
