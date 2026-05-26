/**
 * Unit tests for AppointmentBookingProcessor.
 * Verifies TCPA checks, booking link generation, SMS send, and lead status transition.
 */

jest.mock('@conversionops/orchestration', () => ({
  queues: {
    notification: { add: jest.fn().mockResolvedValue(undefined) },
  },
  NotificationService: jest.fn().mockImplementation(() => ({
    sendToWorkspace: jest.fn().mockResolvedValue(undefined),
  })),
  transitionLead: jest.fn(),
}));

jest.mock('@conversionops/integrations', () => ({
  CalComClient: jest.fn().mockImplementation(() => ({
    createBookingLink: jest.fn().mockReturnValue('https://cal.com/agent/30min?name=Jane'),
  })),
  TwilioClient: jest.fn().mockImplementation(() => ({
    sendSMS: jest.fn().mockResolvedValue({ ok: true, value: 'SM123' }),
  })),
}));

jest.mock('@conversionops/compliance', () => ({
  isQuietHours: jest.fn().mockReturnValue(false),
  validateConsent: jest.fn().mockResolvedValue(true),
}));

jest.mock('@conversionops/observability', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { AppointmentBookingProcessor } from '../processors/appointment-booking.processor';
import { transitionLead } from '@conversionops/orchestration';
import { isQuietHours, validateConsent } from '@conversionops/compliance';
import { TwilioClient, CalComClient } from '@conversionops/integrations';
import type { Job } from 'bullmq';
import type { AppointmentBookingJobData } from '@conversionops/orchestration';
import { LeadStatus } from '@conversionops/db';

const mockTransitionLead  = transitionLead  as jest.MockedFunction<typeof transitionLead>;
const mockIsQuietHours    = isQuietHours    as jest.MockedFunction<typeof isQuietHours>;
const mockValidateConsent = validateConsent as jest.MockedFunction<typeof validateConsent>;

function makeJob(overrides: Partial<AppointmentBookingJobData> = {}): Job<AppointmentBookingJobData> {
  return {
    data: {
      workspaceId: 'ws-1',
      leadId: 'lead-1',
      conversationId: 'conv-1',
      ...overrides,
    },
  } as unknown as Job<AppointmentBookingJobData>;
}

const LEAD = {
  id: 'lead-1',
  workspaceId: 'ws-1',
  phone: '+15551234567',
  name: 'Jane Doe',
  email: 'jane@example.com',
  status: LeadStatus.QUALIFIED,
  deletedAt: null,
};

const WORKSPACE = {
  id: 'ws-1',
  name: 'Test Brokerage',
  timezone: 'America/New_York',
  twilioNumber: '+15559999999',
  aiConfig: {
    defaultBookingLink: 'https://calendly.com/agent/30min',
    agentName: 'Sarah',
  } as Record<string, unknown>,
};

function buildMockPrisma(overrides: {
  lead?: typeof LEAD | null;
  workspace?: typeof WORKSPACE | null;
} = {}) {
  const lead = overrides.lead !== undefined ? overrides.lead : LEAD;
  const workspace = overrides.workspace !== undefined ? overrides.workspace : WORKSPACE;
  return {
    lead: {
      findFirst: jest.fn().mockResolvedValue(lead),
      update: jest.fn().mockResolvedValue({ ...lead, status: LeadStatus.APPOINTMENT_REQUESTED }),
    },
    workspace: { findUnique: jest.fn().mockResolvedValue(workspace) },
    message: { create: jest.fn().mockResolvedValue({ id: 'msg-1' }) },
  };
}

describe('AppointmentBookingProcessor — process()', () => {
  let processor: AppointmentBookingProcessor;
  const mockRealtime = { emitToWorkspace: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransitionLead.mockReturnValue(LeadStatus.APPOINTMENT_REQUESTED);
    mockIsQuietHours.mockReturnValue(false);
    mockValidateConsent.mockResolvedValue(true);
  });

  it('skips when lead not found', async () => {
    const prisma = buildMockPrisma({ lead: null });
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('skips when workspace not found', async () => {
    const prisma = buildMockPrisma({ workspace: null });
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('skips when lead has no phone', async () => {
    const prisma = buildMockPrisma({
      lead: { ...LEAD, phone: null as unknown as string },
    });
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('skips during quiet hours (TCPA)', async () => {
    mockIsQuietHours.mockReturnValue(true);
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('skips when no TCPA consent', async () => {
    mockValidateConsent.mockResolvedValue(false);
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('skips when no booking link available', async () => {
    const prisma = buildMockPrisma({
      workspace: { ...WORKSPACE, aiConfig: {} as Record<string, unknown> },
    });
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('creates message record after successful SMS', async () => {
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          conversationId: 'conv-1',
          role: 'AI',
        }),
      }),
    );
  });

  it('transitions lead to APPOINTMENT_REQUESTED on success', async () => {
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1', workspaceId: 'ws-1' },
        data: expect.objectContaining({ status: LeadStatus.APPOINTMENT_REQUESTED }),
      }),
    );
  });

  it('emits message:new realtime event on success', async () => {
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(mockRealtime.emitToWorkspace).toHaveBeenCalledWith(
      'ws-1',
      'message:new',
      expect.objectContaining({ conversationId: 'conv-1', role: 'AI' }),
    );
  });

  it('uses Cal.com link when calcomEventTypeId configured', async () => {
    const mockCreateBookingLink = jest.fn().mockReturnValue('https://cal.com/agent/30min?name=Jane');
    (CalComClient as jest.Mock).mockImplementation(() => ({ createBookingLink: mockCreateBookingLink }));

    const prisma = buildMockPrisma({
      workspace: {
        ...WORKSPACE,
        aiConfig: {
          calcomApiKey: 'cal-key-abc',
          calcomEventTypeId: 42,
          agentName: 'Sarah',
        },
      },
    });
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(mockCreateBookingLink).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ name: 'Jane Doe', phone: '+15551234567' }),
    );
  });

  it('does NOT create message when conversationId is absent', async () => {
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob({ conversationId: undefined }));

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('does NOT update lead status when transition returns same status', async () => {
    // transitionLead returns same status → no update should happen
    mockTransitionLead.mockReturnValue(LeadStatus.QUALIFIED);
    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('does not create message on SMS failure', async () => {
    const mockSendSMS = jest.fn().mockResolvedValue({ ok: false, error: new Error('Twilio error') });
    (TwilioClient as jest.Mock).mockImplementation(() => ({ sendSMS: mockSendSMS }));

    const prisma = buildMockPrisma();
    processor = new AppointmentBookingProcessor(prisma as never, mockRealtime as never);

    await processor.process(makeJob());

    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
