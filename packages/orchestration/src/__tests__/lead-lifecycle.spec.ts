/**
 * Unit tests for the lead lifecycle XState machine and transitionLead().
 * Verifies all valid transitions, invalid event no-ops, and terminal states.
 */

import { createActor } from 'xstate';
import { transitionLead, createLeadMachine } from '../workflows/lead-lifecycle.workflow';
import { LeadStatus } from '@conversionops/db';

describe('transitionLead — happy path transitions', () => {
  it('NEW → CONTACTED via CONTACT_MADE', () => {
    expect(transitionLead(LeadStatus.NEW, { type: 'CONTACT_MADE' })).toBe(LeadStatus.CONTACTED);
  });

  it('NEW → OPT_OUT via OPT_OUT', () => {
    expect(transitionLead(LeadStatus.NEW, { type: 'OPT_OUT' })).toBe(LeadStatus.OPT_OUT);
  });

  it('NEW → DISQUALIFIED via DISQUALIFY', () => {
    expect(transitionLead(LeadStatus.NEW, { type: 'DISQUALIFY' })).toBe(LeadStatus.DISQUALIFIED);
  });

  it('CONTACTED → QUALIFYING via QUALIFICATION_STARTED', () => {
    expect(transitionLead(LeadStatus.CONTACTED, { type: 'QUALIFICATION_STARTED' })).toBe(LeadStatus.QUALIFYING);
  });

  it('CONTACTED → UNRESPONSIVE via MARK_UNRESPONSIVE', () => {
    expect(transitionLead(LeadStatus.CONTACTED, { type: 'MARK_UNRESPONSIVE' })).toBe(LeadStatus.UNRESPONSIVE);
  });

  it('QUALIFYING → QUALIFIED via QUALIFICATION_COMPLETED', () => {
    expect(transitionLead(LeadStatus.QUALIFYING, { type: 'QUALIFICATION_COMPLETED' })).toBe(LeadStatus.QUALIFIED);
  });

  it('QUALIFIED → ROUTING via ROUTE', () => {
    expect(transitionLead(LeadStatus.QUALIFIED, { type: 'ROUTE' })).toBe(LeadStatus.ROUTING);
  });

  it('QUALIFIED → APPOINTMENT_REQUESTED via REQUEST_APPOINTMENT', () => {
    expect(transitionLead(LeadStatus.QUALIFIED, { type: 'REQUEST_APPOINTMENT' })).toBe(LeadStatus.APPOINTMENT_REQUESTED);
  });

  it('ROUTING → ASSIGNED via ASSIGN', () => {
    expect(transitionLead(LeadStatus.ROUTING, { type: 'ASSIGN' })).toBe(LeadStatus.ASSIGNED);
  });

  it('ASSIGNED → APPOINTMENT_REQUESTED via REQUEST_APPOINTMENT', () => {
    expect(transitionLead(LeadStatus.ASSIGNED, { type: 'REQUEST_APPOINTMENT' })).toBe(LeadStatus.APPOINTMENT_REQUESTED);
  });

  it('APPOINTMENT_REQUESTED → APPOINTMENT_SCHEDULED via BOOK_APPOINTMENT', () => {
    expect(transitionLead(LeadStatus.APPOINTMENT_REQUESTED, { type: 'BOOK_APPOINTMENT' })).toBe(LeadStatus.APPOINTMENT_SCHEDULED);
  });

  it('APPOINTMENT_SCHEDULED → CONVERTED via CONVERT', () => {
    expect(transitionLead(LeadStatus.APPOINTMENT_SCHEDULED, { type: 'CONVERT' })).toBe(LeadStatus.CONVERTED);
  });

  it('UNRESPONSIVE → DORMANT via MARK_DORMANT', () => {
    expect(transitionLead(LeadStatus.UNRESPONSIVE, { type: 'MARK_DORMANT' })).toBe(LeadStatus.DORMANT);
  });

  it('UNRESPONSIVE → CONTACTED via CONTACT_MADE (re-engagement)', () => {
    expect(transitionLead(LeadStatus.UNRESPONSIVE, { type: 'CONTACT_MADE' })).toBe(LeadStatus.CONTACTED);
  });

  it('DORMANT → REACTIVATED via REACTIVATE', () => {
    expect(transitionLead(LeadStatus.DORMANT, { type: 'REACTIVATE' })).toBe(LeadStatus.REACTIVATED);
  });

  it('REACTIVATED → QUALIFYING via QUALIFICATION_STARTED', () => {
    expect(transitionLead(LeadStatus.REACTIVATED, { type: 'QUALIFICATION_STARTED' })).toBe(LeadStatus.QUALIFYING);
  });
});

describe('transitionLead — invalid events return unchanged status', () => {
  it('CONVERTED ignores CONTACT_MADE (terminal state)', () => {
    expect(transitionLead(LeadStatus.CONVERTED, { type: 'CONTACT_MADE' })).toBe(LeadStatus.CONVERTED);
  });

  it('OPT_OUT ignores CONTACT_MADE (terminal state)', () => {
    expect(transitionLead(LeadStatus.OPT_OUT, { type: 'CONTACT_MADE' })).toBe(LeadStatus.OPT_OUT);
  });

  it('DISQUALIFIED ignores CONTACT_MADE (terminal state)', () => {
    expect(transitionLead(LeadStatus.DISQUALIFIED, { type: 'CONTACT_MADE' })).toBe(LeadStatus.DISQUALIFIED);
  });

  it('NEW ignores QUALIFICATION_COMPLETED (out-of-order)', () => {
    expect(transitionLead(LeadStatus.NEW, { type: 'QUALIFICATION_COMPLETED' })).toBe(LeadStatus.NEW);
  });

  it('NEW ignores ROUTE (out-of-order)', () => {
    expect(transitionLead(LeadStatus.NEW, { type: 'ROUTE' })).toBe(LeadStatus.NEW);
  });

  it('ROUTING ignores QUALIFICATION_COMPLETED (already past that stage)', () => {
    expect(transitionLead(LeadStatus.ROUTING, { type: 'QUALIFICATION_COMPLETED' })).toBe(LeadStatus.ROUTING);
  });
});

describe('transitionLead — opt-out from any state', () => {
  const optOutStates = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFYING,
    LeadStatus.QUALIFIED,
    LeadStatus.ROUTING,
    LeadStatus.ASSIGNED,
    LeadStatus.APPOINTMENT_REQUESTED,
    LeadStatus.APPOINTMENT_SCHEDULED,
    LeadStatus.UNRESPONSIVE,
    LeadStatus.DORMANT,
    LeadStatus.REACTIVATED,
  ];

  it.each(optOutStates)('%s → OPT_OUT via OPT_OUT', (status) => {
    expect(transitionLead(status, { type: 'OPT_OUT' })).toBe(LeadStatus.OPT_OUT);
  });
});

describe('transitionLead — disqualify from any active state', () => {
  const activeStates = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFYING,
    LeadStatus.QUALIFIED,
    LeadStatus.ROUTING,
    LeadStatus.ASSIGNED,
  ];

  it.each(activeStates)('%s → DISQUALIFIED via DISQUALIFY', (status) => {
    expect(transitionLead(status, { type: 'DISQUALIFY' })).toBe(LeadStatus.DISQUALIFIED);
  });
});

describe('createLeadMachine()', () => {
  it('creates a machine with initial state NEW', () => {
    const machine = createLeadMachine({ leadId: 'lead-1', workspaceId: 'ws-1' });
    expect(machine.resolveState({ value: LeadStatus.NEW, context: {} }).value).toBe(LeadStatus.NEW);
  });

  it('embeds context into the machine', () => {
    const machine = createLeadMachine({ leadId: 'lead-abc', workspaceId: 'ws-xyz' });
    const actor = createActor(machine);
    actor.start();
    const ctx = actor.getSnapshot().context;
    actor.stop();
    expect(ctx.leadId).toBe('lead-abc');
    expect(ctx.workspaceId).toBe('ws-xyz');
  });
});
