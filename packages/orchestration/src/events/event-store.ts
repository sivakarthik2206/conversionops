import { PrismaClient, LeadEvent, LeadStatus, Prisma } from '@conversionops/db';
import type { LeadEventType } from '@conversionops/types';

export interface AppendEventInput {
  leadId: string;
  workspaceId: string;
  type: LeadEventType;
  payload?: Record<string, unknown>;
  triggeredBy?: string;
  triggerSource?: string;
  correlationId?: string;
}

export interface LeadState {
  leadId: string;
  workspaceId: string;
  status: LeadStatus;
  assignedTo: string | null;
  score: number;
  lastEventType: string;
  lastEventAt: Date;
  eventCount: number;
}

const EVENT_TO_STATUS: Partial<Record<LeadEventType, LeadStatus>> = {
  'lead.created': LeadStatus.NEW,
  'lead.contacted': LeadStatus.CONTACTED,
  'lead.qualification.started': LeadStatus.QUALIFYING,
  'lead.qualification.completed': LeadStatus.QUALIFIED,
  'lead.routed': LeadStatus.ROUTING,
  'lead.assigned': LeadStatus.ASSIGNED,
  'lead.appointment.requested': LeadStatus.APPOINTMENT_REQUESTED,
  'lead.appointment.booked': LeadStatus.APPOINTMENT_SCHEDULED,
  'lead.converted': LeadStatus.CONVERTED,
  'lead.dormant': LeadStatus.DORMANT,
  'lead.reactivated': LeadStatus.REACTIVATED,
  'lead.opted-out': LeadStatus.OPT_OUT,
};

function applyLeadEvent(state: LeadState, event: LeadEvent): LeadState {
  const eventType = event.type as LeadEventType;
  const newStatus = EVENT_TO_STATUS[eventType];
  const payload = event.payload as Record<string, unknown>;

  return {
    ...state,
    status: newStatus ?? state.status,
    assignedTo:
      eventType === 'lead.assigned' && typeof payload['workspaceUserId'] === 'string'
        ? payload['workspaceUserId']
        : state.assignedTo,
    score:
      eventType === 'lead.scored' && typeof payload['score'] === 'number'
        ? payload['score']
        : state.score,
    lastEventType: event.type,
    lastEventAt: event.occurredAt,
    eventCount: state.eventCount + 1,
  };
}

export class EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Appends a new event to the lead event log with an atomically-assigned sequence number.
   * @param event - Event data to append
   * @returns The persisted LeadEvent record
   */
  async append(event: AppendEventInput): Promise<LeadEvent> {
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.leadEvent.findFirst({
        where: { leadId: event.leadId },
        orderBy: { sequence: 'desc' },
      });
      const sequence = (last?.sequence ?? 0) + 1;
      return tx.leadEvent.create({
        data: {
          leadId: event.leadId,
          workspaceId: event.workspaceId,
          sequence,
          type: event.type,
          payload: (event.payload ?? {}) as Prisma.InputJsonValue,
          triggeredBy: event.triggeredBy,
          triggerSource: event.triggerSource,
          correlationId: event.correlationId,
        },
      });
    });
  }

  /**
   * Returns the full ordered event history for a lead.
   * @param leadId - The lead whose events to retrieve
   * @returns Events ordered by sequence ascending
   */
  async getHistory(leadId: string): Promise<LeadEvent[]> {
    return this.prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { sequence: 'asc' },
    });
  }

  /**
   * Replays the event log to compute the current LeadState.
   * @param leadId - The lead to replay
   * @returns Computed state derived from all events
   */
  async replay(leadId: string): Promise<LeadState | null> {
    const events = await this.getHistory(leadId);
    if (events.length === 0) return null;

    const first = events[0];
    if (!first) return null;

    const initial: LeadState = {
      leadId,
      workspaceId: first.workspaceId,
      status: LeadStatus.NEW,
      assignedTo: null,
      score: 0,
      lastEventType: '',
      lastEventAt: first.occurredAt,
      eventCount: 0,
    };

    return events.reduce(applyLeadEvent, initial);
  }
}
