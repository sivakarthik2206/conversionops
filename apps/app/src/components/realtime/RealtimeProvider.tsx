'use client';
import {
  createContext, useContext, useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { formatFullDate, formatMessageTime } from '@/lib/format-time';

// ─── Event types (single source of truth; re-exported by hooks/useRealtime) ──

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export type RealtimeEvent =
  | 'lead:created'
  | 'lead:scored'
  | 'lead:assigned'
  | 'message:new'
  | 'conversation:takeover'
  | 'conversation:escalated'
  | 'typing:start'
  | 'typing:stop'
  | 'appointment:booked'
  | 'notification:new';

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

export interface ConversationEscalatedEvent {
  conversationId: string;
  escalationLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason: string;
}

export interface TypingEvent {
  conversationId: string;
  role: 'AI' | 'HUMAN';
}

export interface AppointmentBookedEvent {
  appointmentId: string;
  leadId: string;
  scheduledAt: string;
  workspaceId: string;
}

export interface NotificationNewEvent {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  leadId?: string;
}

type EventHandler = (data: unknown) => void;
type IconName = Parameters<typeof Icon>[0]['name'];

// ─── Activity feed model ─────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  kind: RealtimeEvent;
  title: string;
  detail: string;
  color: string;
  icon: IconName;
  href?: string;
  at: number;
  /** When true, this item also surfaces as a slide-in toast. */
  toast: boolean;
}

const TIER_COLOR: Record<string, string> = {
  PRIORITY: 'var(--accent)',
  HOT: 'var(--green)',
  WARM: 'var(--amber)',
  COLD: 'var(--blue)',
};

const ALL_EVENTS: RealtimeEvent[] = [
  'lead:created', 'lead:scored', 'lead:assigned',
  'message:new', 'conversation:takeover', 'conversation:escalated',
  'typing:start', 'typing:stop',
  'appointment:booked', 'notification:new',
];

function prettySource(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Maps a raw socket event to a feed/toast item, or null if it should be ignored. */
function buildActivity(event: RealtimeEvent, data: unknown): ActivityItem | null {
  const now = Date.now();
  const base = { at: now, kind: event };

  switch (event) {
    case 'lead:created': {
      const e = data as LeadCreatedEvent;
      const hot = e.tier === 'HOT' || e.tier === 'PRIORITY' || e.score >= 80;
      return {
        ...base,
        id: `created:${e.leadId}:${now}`,
        title: hot ? 'New hot lead' : 'New lead',
        detail: `${e.name ?? 'Unknown'} · ${prettySource(e.source)}${e.score ? ` · ${e.score}` : ''}`,
        color: hot ? 'var(--accent)' : TIER_COLOR[e.tier] ?? 'var(--blue)',
        icon: hot ? 'bolt' : 'plus',
        href: `/leads/${e.leadId}`,
        toast: hot,
      };
    }
    case 'lead:scored': {
      const e = data as LeadScoredEvent;
      const hot = e.score >= 80;
      return {
        ...base,
        id: `scored:${e.leadId}:${now}`,
        title: hot ? 'Lead heating up' : 'Lead rescored',
        detail: `Score ${e.score} · ${e.tier}`,
        color: TIER_COLOR[e.tier] ?? 'var(--accent)',
        icon: 'chart',
        href: `/leads/${e.leadId}`,
        toast: hot,
      };
    }
    case 'lead:assigned': {
      const e = data as LeadAssignedEvent;
      return {
        ...base,
        id: `assigned:${e.leadId}:${now}`,
        title: 'Lead assigned',
        detail: 'Routed to an agent',
        color: 'var(--green)',
        icon: 'user',
        href: `/leads/${e.leadId}`,
        toast: false,
      };
    }
    case 'conversation:escalated': {
      const e = data as ConversationEscalatedEvent;
      const urgent = e.escalationLevel === 'URGENT' || e.escalationLevel === 'HIGH';
      return {
        ...base,
        id: `escalated:${e.conversationId}:${now}`,
        title: `${e.escalationLevel} escalation`,
        detail: e.reason || 'Needs human attention',
        color: urgent ? 'var(--red)' : 'var(--amber)',
        icon: 'shield',
        href: `/conversations/${e.conversationId}`,
        toast: true,
      };
    }
    case 'appointment:booked': {
      const e = data as AppointmentBookedEvent;
      const when = e.scheduledAt ? `${formatFullDate(e.scheduledAt)} at ${formatMessageTime(e.scheduledAt)}` : '';
      return {
        ...base,
        id: `appt:${e.appointmentId}:${now}`,
        title: 'Appointment booked',
        detail: when || 'New booking confirmed',
        color: 'var(--accent)',
        icon: 'calendar',
        href: `/appointments`,
        toast: true,
      };
    }
    case 'conversation:takeover': {
      const e = data as ConversationTakeoverEvent;
      return {
        ...base,
        id: `takeover:${e.conversationId}:${now}`,
        title: 'Human takeover',
        detail: 'An agent took over the chat',
        color: 'var(--purple)',
        icon: 'user',
        href: `/conversations/${e.conversationId}`,
        toast: false,
      };
    }
    case 'message:new': {
      const e = data as MessageNewEvent;
      if (e.role === 'SYSTEM') return null;
      return {
        ...base,
        id: `msg:${e.messageId}:${now}`,
        title: e.role === 'AI' ? 'AI replied' : 'New message',
        detail: e.content.length > 60 ? `${e.content.slice(0, 60)}…` : e.content,
        color: e.role === 'AI' ? 'var(--purple)' : 'var(--text-2)',
        icon: 'message',
        href: `/conversations/${e.conversationId}`,
        toast: false,
      };
    }
    case 'notification:new': {
      const e = data as NotificationNewEvent;
      return {
        ...base,
        id: `notif:${e.id ?? now}:${now}`,
        title: e.title ?? 'New notification',
        detail: e.body ?? prettySource(e.type ?? 'alert'),
        color: 'var(--blue)',
        icon: 'bell',
        href: e.leadId ? `/leads/${e.leadId}` : '/notifications',
        toast: true,
      };
    }
    default:
      return null;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface RealtimeContextValue {
  on: <T = unknown>(event: RealtimeEvent, handler: (data: T) => void) => () => void;
  emit: (event: string, data: unknown) => void;
  joinConversation: (conversationId: string) => void;
  connectionState: ConnectionState;
  feed: ActivityItem[];
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const NOOP_VALUE: RealtimeContextValue = {
  on: () => () => undefined,
  emit: () => undefined,
  joinConversation: () => undefined,
  connectionState: 'disconnected',
  feed: [],
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function RealtimeProvider({ children, workspaceId }: { children: React.ReactNode; workspaceId?: string }) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const dedupeRef = useRef<Map<string, number>>(new Map());
  const roomsRef = useRef<{ workspace: Set<string>; conversations: Set<string> }>({
    workspace: new Set(),
    conversations: new Set(),
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [toasts, setToasts] = useState<ActivityItem[]>([]);

  const pushActivity = useCallback((item: ActivityItem) => {
    setFeed(prev => [item, ...prev].slice(0, 40));
    if (item.toast) {
      setToasts(prev => [item, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, 6500);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('co_token') : null;
    if (!token) {
      setConnectionState('disconnected');
      return;
    }

    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'];
    if (!wsUrl) {
      if (process.env.NODE_ENV === 'production') {
        setConnectionState('disconnected');
        return;
      }
    }
    const resolvedWsUrl = wsUrl ?? 'http://localhost:3001';
    const socket = io(resolvedWsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      timeout: 20_000,
    });
    socketRef.current = socket;

    const rejoinRooms = () => {
      roomsRef.current.workspace.forEach(id => socket.emit('join:workspace', { workspaceId: id }));
      roomsRef.current.conversations.forEach(id =>
        socket.emit('join:conversation', { conversationId: id, workspaceId }),
      );
    };

    socket.on('connect', () => {
      setConnectionState('connected');
      if (workspaceId) {
        socket.emit('join:workspace', { workspaceId });
        roomsRef.current.workspace.add(workspaceId);
      }
      rejoinRooms();
    });

    socket.on('disconnect', () => setConnectionState('disconnected'));
    socket.on('connect_error', () => setConnectionState('reconnecting'));
    socket.io.on('reconnect_attempt', () => setConnectionState('reconnecting'));
    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      rejoinRooms();
    });

    for (const event of ALL_EVENTS) {
      socket.on(event, (data: unknown) => {
        // Deduplication: suppress duplicate events within a 60s window
        const payload = data as Record<string, unknown>;
        const uid = (payload.messageId ?? payload.leadId ?? payload.conversationId ?? payload.appointmentId) as string | undefined;
        if (uid) {
          const key = `${event}:${uid}`;
          const dnow = Date.now();
          if (dedupeRef.current.has(key)) return;
          dedupeRef.current.set(key, dnow);
          if (dedupeRef.current.size > 200) {
            for (const [k, ts] of dedupeRef.current) {
              if (dnow - ts > 60_000) dedupeRef.current.delete(k);
            }
          }
        }
        // Fan out to page-level subscribers
        handlersRef.current.get(event)?.forEach(h => h(data));
        // Feed the global live-activity layer (typing events excluded)
        if (event !== 'typing:start' && event !== 'typing:stop') {
          const item = buildActivity(event, data);
          if (item) pushActivity(item);
        }
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, pushActivity]);

  const on = useCallback(<T = unknown>(event: RealtimeEvent, handler: (data: T) => void): (() => void) => {
    const h = handler as EventHandler;
    const set = handlersRef.current.get(event) ?? new Set<EventHandler>();
    set.add(h);
    handlersRef.current.set(event, set);
    return () => { set.delete(h); };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    roomsRef.current.conversations.add(conversationId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:conversation', { conversationId, workspaceId });
    }
  }, [workspaceId]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({ on, emit, joinConversation, connectionState, feed }),
    [on, emit, joinConversation, connectionState, feed],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <EventToastStack toasts={toasts} onDismiss={dismissToast} />
    </RealtimeContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Socket access for page-level subscriptions. Backward-compatible with the
 * previous standalone hook: returns { on, emit, joinConversation, connectionState }.
 * Reads from the shared RealtimeProvider; returns a safe no-op outside a provider.
 */
export function useRealtime(_workspaceId?: string) {
  const ctx = useContext(RealtimeContext);
  return ctx ?? NOOP_VALUE;
}

/** The global live-activity feed + connection state for ambient UI (ticker, etc.). */
export function useLiveActivity(): { feed: ActivityItem[]; connectionState: ConnectionState } {
  const ctx = useContext(RealtimeContext) ?? NOOP_VALUE;
  return { feed: ctx.feed, connectionState: ctx.connectionState };
}

// ─── Toast stack (rendered once by the provider) ─────────────────────────────

function EventToastStack({ toasts, onDismiss }: { toasts: ActivityItem[]; onDismiss: (id: string) => void }) {
  const router = useRouter();
  return (
    <div
      style={{
        position: 'fixed',
        top: 76,
        right: 20,
        zIndex: 600,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
        width: 340,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={() => { if (t.href) router.push(t.href); onDismiss(t.id); }}
            style={{
              pointerEvents: 'auto',
              textAlign: 'left',
              cursor: t.href ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '13px 14px',
              borderRadius: 14,
              background: 'linear-gradient(180deg, var(--bg-3) 0%, var(--bg-2) 100%)',
              border: `1px solid ${t.color}40`,
              boxShadow: `0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), 0 0 24px ${t.color}22`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* accent rail */}
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.color, boxShadow: `0 0 12px ${t.color}` }} />
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: `${t.color}1f`,
                border: `1px solid ${t.color}3a`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.color,
                flexShrink: 0,
              }}
            >
              <Icon name={t.icon} size={15} stroke={1.9} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.title}</span>
                <span className="dot-live" style={{ color: t.color, width: 5, height: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, display: 'block' }} />
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.detail}
              </div>
            </div>
            {/* shrinking timer bar */}
            <motion.span
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6.5, ease: 'linear' }}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                background: t.color,
                opacity: 0.5,
                transformOrigin: 'left',
              }}
            />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
