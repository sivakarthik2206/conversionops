import { createMachine, createActor } from 'xstate';
import { LeadStatus } from '@conversionops/db';

export interface LeadMachineContext {
  leadId?: string;
  workspaceId?: string;
}

export type LeadMachineEventType =
  | 'CONTACT_MADE'
  | 'QUALIFICATION_STARTED'
  | 'QUALIFICATION_COMPLETED'
  | 'ROUTE'
  | 'ASSIGN'
  | 'REQUEST_APPOINTMENT'
  | 'BOOK_APPOINTMENT'
  | 'CONVERT'
  | 'MARK_UNRESPONSIVE'
  | 'MARK_DORMANT'
  | 'REACTIVATE'
  | 'OPT_OUT'
  | 'DISQUALIFY';

export interface LeadMachineEvent {
  type: LeadMachineEventType;
}

const OPT_OUT_TRANSITION = { OPT_OUT: LeadStatus.OPT_OUT };
const DISQUALIFY_TRANSITION = { DISQUALIFY: LeadStatus.DISQUALIFIED };
const UNRESPONSIVE_TRANSITION = { MARK_UNRESPONSIVE: LeadStatus.UNRESPONSIVE };

/**
 * Creates the XState v5 lead lifecycle machine.
 * The machine is purely declarative — no side effects or database calls.
 * @param context - Optional lead/workspace context to embed in the machine
 */
export function createLeadMachine(context: LeadMachineContext) {
  return createMachine({
    id: 'leadLifecycle',
    initial: LeadStatus.NEW,
    context,
    types: {} as {
      context: LeadMachineContext;
      events: LeadMachineEvent;
    },
    states: {
      [LeadStatus.NEW]: {
        on: {
          CONTACT_MADE: LeadStatus.CONTACTED,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.CONTACTED]: {
        on: {
          QUALIFICATION_STARTED: LeadStatus.QUALIFYING,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.QUALIFYING]: {
        on: {
          QUALIFICATION_COMPLETED: LeadStatus.QUALIFIED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.QUALIFIED]: {
        on: {
          ROUTE: LeadStatus.ROUTING,
          REQUEST_APPOINTMENT: LeadStatus.APPOINTMENT_REQUESTED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.ROUTING]: {
        on: {
          ASSIGN: LeadStatus.ASSIGNED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.ASSIGNED]: {
        on: {
          REQUEST_APPOINTMENT: LeadStatus.APPOINTMENT_REQUESTED,
          CONTACT_MADE: LeadStatus.CONTACTED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.APPOINTMENT_REQUESTED]: {
        on: {
          BOOK_APPOINTMENT: LeadStatus.APPOINTMENT_SCHEDULED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.APPOINTMENT_SCHEDULED]: {
        on: {
          CONVERT: LeadStatus.CONVERTED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.CONVERTED]: {
        type: 'final',
      },
      [LeadStatus.UNRESPONSIVE]: {
        on: {
          MARK_DORMANT: LeadStatus.DORMANT,
          CONTACT_MADE: LeadStatus.CONTACTED,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.DORMANT]: {
        on: {
          REACTIVATE: LeadStatus.REACTIVATED,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.REACTIVATED]: {
        on: {
          QUALIFICATION_STARTED: LeadStatus.QUALIFYING,
          CONTACT_MADE: LeadStatus.CONTACTED,
          ...UNRESPONSIVE_TRANSITION,
          ...OPT_OUT_TRANSITION,
          ...DISQUALIFY_TRANSITION,
        },
      },
      [LeadStatus.OPT_OUT]: {
        type: 'final',
      },
      [LeadStatus.DISQUALIFIED]: {
        type: 'final',
      },
    },
  });
}

/**
 * Performs a pure state transition using the XState lead lifecycle machine.
 * Does NOT write to the database — callers must append LeadEvent separately.
 * @param currentStatus - The lead's current status
 * @param event - The event to send to the machine
 * @param context - Optional machine context
 * @returns The new LeadStatus after transition, or the unchanged status if no transition applies
 */
export function transitionLead(
  currentStatus: LeadStatus,
  event: LeadMachineEvent,
  context: LeadMachineContext = {},
): LeadStatus {
  const machine = createLeadMachine(context);
  const restoredSnapshot = machine.resolveState({ value: currentStatus, context });
  const actor = createActor(machine, { snapshot: restoredSnapshot });
  actor.start();
  actor.send(event);
  const snapshot = actor.getSnapshot();
  actor.stop();
  return snapshot.value as LeadStatus;
}
