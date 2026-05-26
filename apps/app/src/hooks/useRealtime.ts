// Backward-compatible barrel: the realtime implementation now lives in a single
// shared provider so the whole app uses ONE socket. All prior imports
// (`import { useRealtime } from '@/hooks/useRealtime'`, event types, etc.) keep working.
export {
  RealtimeProvider,
  useRealtime,
  useLiveActivity,
} from '@/components/realtime/RealtimeProvider';

export type {
  ConnectionState,
  RealtimeEvent,
  ActivityItem,
  LeadCreatedEvent,
  LeadScoredEvent,
  LeadAssignedEvent,
  MessageNewEvent,
  ConversationTakeoverEvent,
  ConversationEscalatedEvent,
  TypingEvent,
  AppointmentBookedEvent,
  NotificationNewEvent,
} from '@/components/realtime/RealtimeProvider';
