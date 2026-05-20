import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type RealtimeEvent =
  | 'lead:created'
  | 'lead:scored'
  | 'lead:assigned'
  | 'message:new'
  | 'conversation:takeover'
  | 'appointment:booked'
  | 'notification:new';

// Typed event payloads
export interface LeadCreatedEvent {
  leadId: string;
  source: string;
  workspaceId: string;
  createdAt: string;
  status: string;
  name: string | null;
  phone: string | null;
  score: number;
  tier: string;
}

export interface LeadScoredEvent {
  leadId: string;
  score: number;
  tier: string;
  workspaceId: string;
}

export interface LeadAssignedEvent {
  leadId: string;
  workspaceUserId: string;
  workspaceId: string;
}

export interface MessageNewEvent {
  conversationId: string;
  messageId: string;
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface ConversationTakeoverEvent {
  conversationId: string;
  takenOverBy: string;
}

export interface AppointmentBookedEvent {
  appointmentId: string;
  leadId: string;
  scheduledAt: string;
  workspaceId: string;
}

type EventHandler = (data: unknown) => void;

export function useRealtime(workspaceId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3001';

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    if (workspaceId) {
      socket.on('connect', () => {
        socket.emit('join:workspace', { workspaceId });
      });
    }

    const events: RealtimeEvent[] = [
      'lead:created', 'lead:scored', 'lead:assigned',
      'message:new', 'conversation:takeover',
      'appointment:booked', 'notification:new',
    ];

    for (const event of events) {
      socket.on(event, (data: unknown) => {
        const handlers = handlersRef.current.get(event);
        handlers?.forEach((handler) => handler(data));
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId]);

  const on = useCallback(<T = unknown>(event: RealtimeEvent, handler: (data: T) => void): (() => void) => {
    const typedHandler = handler as EventHandler;
    const handlers = handlersRef.current.get(event) ?? new Set();
    handlers.add(typedHandler);
    handlersRef.current.set(event, handlers);

    return () => {
      handlers.delete(typedHandler);
    };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current && workspaceId) {
      socketRef.current.emit('join:conversation', { conversationId, workspaceId });
    }
  }, [workspaceId]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { on, emit, joinConversation, socket: socketRef.current };
}
