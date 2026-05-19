'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MessageNewEvent {
  conversationId: string;
  messageId: string;
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface LeadCreatedEvent {
  leadId: string;
  source: string;
  createdAt: string;
  workspaceId: string;
}

export interface LeadScoredEvent {
  leadId: string;
  score: number;
  tier: string;
}

export interface LeadAssignedEvent {
  leadId: string;
  workspaceUserId: string;
  routingReason?: string;
}

export interface AppointmentBookedEvent {
  leadId: string;
  conversationId: string;
  appointmentId: string;
}

export interface ConversationTakeoverEvent {
  conversationId: string;
  takenOverBy: string;
}

export interface NotificationNewEvent {
  notificationId: string;
  type: string;
  message: string;
}

export interface ServerToClientEvents {
  'message:new': (data: MessageNewEvent) => void;
  'lead:created': (data: LeadCreatedEvent) => void;
  'lead:scored': (data: LeadScoredEvent) => void;
  'lead:assigned': (data: LeadAssignedEvent) => void;
  'appointment:booked': (data: AppointmentBookedEvent) => void;
  'conversation:takeover': (data: ConversationTakeoverEvent) => void;
  'notification:new': (data: NotificationNewEvent) => void;
}

type EventName = keyof ServerToClientEvents;
type EventHandler<E extends EventName> = ServerToClientEvents[E];

interface UseRealtimeReturn {
  connected: boolean;
  on: <E extends EventName>(event: E, handler: EventHandler<E>) => () => void;
  emit: (event: string, data?: unknown) => void;
  joinConversation: (conversationId: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;

export function useRealtime(): UseRealtimeReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3001';
    const token = localStorage.getItem('auth_token');

    const socket = io(wsUrl, {
      auth: { token: token ?? '' },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: BASE_RECONNECT_DELAY_MS,
      reconnectionDelayMax: BASE_RECONNECT_DELAY_MS * Math.pow(2, MAX_RECONNECT_ATTEMPTS),
      randomizationFactor: 0.5,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err: Error & { message: string }) => {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback(<E extends EventName>(event: E, handler: EventHandler<E>): (() => void) => {
    const socket = socketRef.current;
    if (!socket) return () => undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on(event as string, handler as (...args: any[]) => void);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off(event as string, handler as (...args: any[]) => void);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown): void => {
    const socket = socketRef.current;
    if (!socket || !connected) return;
    socket.emit(event, data);
  }, [connected]);

  const joinConversation = useCallback((conversationId: string): void => {
    emit('join:conversation', { conversationId });
  }, [emit]);

  return { connected, on, emit, joinConversation };
}
