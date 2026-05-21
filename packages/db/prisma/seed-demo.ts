/**
 * seed-demo.ts — Populates the demo-brokerage workspace with rich data for sales demos.
 *
 * Idempotent: re-running won't create duplicates (uses stable externalIds + upserts).
 * Run: pnpm --filter @conversionops/db run db:seed:demo
 */
import {
  PrismaClient,
  Plan,
  WorkspaceStatus,
  UserRole,
  LeadSource,
  LeadStatus,
  LeadTier,
  ConsentStatus,
  ConsentChannel,
  ConversationStatus,
  Channel,
  MessageRole,
  AppointmentStatus,
  RoutingStrategy,
} from '@prisma/client';

const prisma = new PrismaClient();

const WORKSPACE_SLUG = 'demo-brokerage';
const OWNER_EMAIL = 'demo@conversionops.in';

interface LeadSpec {
  externalId: string;
  source: LeadSource;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  tier: LeadTier;
  score: number;
  qualification: Record<string, unknown>;
  sourcePayload: Record<string, unknown>;
  createdDaysAgo: number;
}

const LEADS: LeadSpec[] = [
  {
    externalId: 'demo-lead-001',
    source: LeadSource.ZILLOW,
    name: 'Jane Smith',
    phone: '+15551110001',
    email: 'jane.smith@example.com',
    status: LeadStatus.APPOINTMENT_SCHEDULED,
    tier: LeadTier.HOT,
    score: 82,
    qualification: { intent: 'buy', area: 'Austin, TX', budget: '$500k', timeline: '30_days', preApproved: true },
    sourcePayload: { listingId: 'zl-12345', propertyAddress: '123 Oak Lane, Austin TX' },
    createdDaysAgo: 2,
  },
  {
    externalId: 'demo-lead-002',
    source: LeadSource.WEB_FORM,
    name: 'Bob Johnson',
    phone: '+15551110002',
    email: 'bob.johnson@example.com',
    status: LeadStatus.QUALIFIED,
    tier: LeadTier.WARM,
    score: 58,
    qualification: { intent: 'sell', area: 'Round Rock, TX', timeline: '90_days' },
    sourcePayload: { form: 'contact-us' },
    createdDaysAgo: 5,
  },
  {
    externalId: 'demo-lead-003',
    source: LeadSource.REALTOR_COM,
    name: 'Carla Mendoza',
    phone: '+15551110003',
    email: 'carla.m@example.com',
    status: LeadStatus.QUALIFYING,
    tier: LeadTier.WARM,
    score: 45,
    qualification: { intent: 'buy', area: 'South Austin', budget: '$350k', timeline: '60_days' },
    sourcePayload: { listingId: 'rc-9981' },
    createdDaysAgo: 1,
  },
  {
    externalId: 'demo-lead-004',
    source: LeadSource.MISSED_CALL,
    name: 'David Chen',
    phone: '+15551110004',
    email: 'd.chen@example.com',
    status: LeadStatus.CONTACTED,
    tier: LeadTier.COLD,
    score: 22,
    qualification: { intent: 'buy', area: 'Cedar Park, TX' },
    sourcePayload: { callDurationSeconds: 0 },
    createdDaysAgo: 3,
  },
  {
    externalId: 'demo-lead-005',
    source: LeadSource.ZILLOW,
    name: 'Emily Rivera',
    phone: '+15551110005',
    email: 'emily.r@example.com',
    status: LeadStatus.CONVERTED,
    tier: LeadTier.PRIORITY,
    score: 95,
    qualification: { intent: 'buy', area: 'Westlake, TX', budget: '$1.2M', timeline: '30_days', preApproved: true },
    sourcePayload: { listingId: 'zl-77723' },
    createdDaysAgo: 14,
  },
  {
    externalId: 'demo-lead-006',
    source: LeadSource.WEB_FORM,
    name: 'Frank Patel',
    phone: '+15551110006',
    email: 'frank.p@example.com',
    status: LeadStatus.NEW,
    tier: LeadTier.UNQUALIFIED,
    score: 5,
    qualification: {},
    sourcePayload: { form: 'home-valuation' },
    createdDaysAgo: 0,
  },
  {
    externalId: 'demo-lead-007',
    source: LeadSource.REFERRAL,
    name: 'Grace Liu',
    phone: '+15551110007',
    email: 'grace.l@example.com',
    status: LeadStatus.DORMANT,
    tier: LeadTier.COLD,
    score: 18,
    qualification: { intent: 'buy', area: 'Pflugerville, TX', timeline: '6_months' },
    sourcePayload: { referredBy: 'jane.smith@example.com' },
    createdDaysAgo: 45,
  },
  {
    externalId: 'demo-lead-008',
    source: LeadSource.SMS_INBOUND,
    name: 'Henry Walsh',
    phone: '+15551110008',
    email: 'henry.w@example.com',
    status: LeadStatus.OPT_OUT,
    tier: LeadTier.UNQUALIFIED,
    score: 0,
    qualification: {},
    sourcePayload: { firstMessage: 'STOP' },
    createdDaysAgo: 7,
  },
];

interface MessageSpec {
  role: MessageRole;
  content: string;
  minutesAfterStart: number;
}

const CONVERSATION_TEMPLATES: Record<string, MessageSpec[]> = {
  'demo-lead-001': [
    { role: MessageRole.LEAD, content: "Hi, I saw the listing on Oak Lane. Still available?", minutesAfterStart: 0 },
    { role: MessageRole.AI, content: "Hi Jane! Yes, 123 Oak Lane is still on the market. Are you looking to buy in Austin, and do you have a timeline?", minutesAfterStart: 1 },
    { role: MessageRole.LEAD, content: "Yes, hoping to close within 30 days. Pre-approved up to $500k.", minutesAfterStart: 3 },
    { role: MessageRole.AI, content: "Perfect — that property is well within range. Would tomorrow at 2pm work for a private showing?", minutesAfterStart: 4 },
    { role: MessageRole.LEAD, content: "2pm works great.", minutesAfterStart: 8 },
    { role: MessageRole.AI, content: "Booked. You'll get a confirmation shortly. Alex (our agent) will meet you on-site.", minutesAfterStart: 9 },
  ],
  'demo-lead-002': [
    { role: MessageRole.LEAD, content: "Looking to sell my home in Round Rock.", minutesAfterStart: 0 },
    { role: MessageRole.AI, content: "Hi Bob — happy to help. What's the address, and when were you hoping to list?", minutesAfterStart: 1 },
    { role: MessageRole.LEAD, content: "Within 90 days. Address is 88 Maple Dr.", minutesAfterStart: 5 },
    { role: MessageRole.AI, content: "Great. I can have an agent send over a free CMA tomorrow — sound good?", minutesAfterStart: 6 },
  ],
  'demo-lead-003': [
    { role: MessageRole.LEAD, content: "Interested in South Austin homes under $400k.", minutesAfterStart: 0 },
    { role: MessageRole.AI, content: "Hi Carla! We have several great options in your range. Are you pre-approved, and what's your move-in target?", minutesAfterStart: 1 },
    { role: MessageRole.LEAD, content: "Not pre-approved yet. Looking 60 days out.", minutesAfterStart: 12 },
    { role: MessageRole.AI, content: "No problem — I can connect you with a lender. What time works for a 15-min call this week?", minutesAfterStart: 13 },
  ],
  'demo-lead-004': [
    { role: MessageRole.AI, content: "Hi David! You just called Alex's office. This is their AI assistant — are you looking to buy or sell in the Cedar Park area? I can help right now.", minutesAfterStart: 0 },
    { role: MessageRole.LEAD, content: "Buying. Just exploring for now.", minutesAfterStart: 30 },
  ],
  'demo-lead-005': [
    { role: MessageRole.LEAD, content: "Saw the Westlake listing — gorgeous. Can we tour?", minutesAfterStart: 0 },
    { role: MessageRole.AI, content: "Hi Emily! Absolutely. Confirming you're pre-approved at the $1.2M range?", minutesAfterStart: 1 },
    { role: MessageRole.LEAD, content: "Yes, cash buyer.", minutesAfterStart: 2 },
    { role: MessageRole.AI, content: "Excellent. Alex will reach out within the hour to schedule. Welcome aboard.", minutesAfterStart: 3 },
  ],
};

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

async function main(): Promise<void> {
  // Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: WORKSPACE_SLUG },
    update: {},
    create: {
      name: 'Demo Brokerage',
      slug: WORKSPACE_SLUG,
      plan: Plan.BROKERAGE,
      status: WorkspaceStatus.ACTIVE,
      ownerEmail: OWNER_EMAIL,
      timezone: 'America/Chicago',
      onboardingCompletedAt: new Date(),
      aiConfig: {
        agentName: 'Alex',
        tone: 'professional and warm',
        customInstructions: 'Focus on Austin-area properties; surface pre-approval early.',
      },
    },
  });

  // Owner
  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { name: 'Demo Owner', emailVerified: true },
    create: { email: OWNER_EMAIL, name: 'Demo Owner', emailVerified: true },
  });

  const workspaceUser = await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: UserRole.OWNER, isActive: true, displayName: 'Demo Owner' },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: UserRole.OWNER,
      displayName: 'Demo Owner',
      isActive: true,
    },
  });

  // Leads, consents, conversations, messages
  const leadIdsBySlug: Record<string, string> = {};
  for (const spec of LEADS) {
    const createdAt = daysAgo(spec.createdDaysAgo);
    const lead = await prisma.lead.upsert({
      where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: spec.externalId } },
      update: {
        status: spec.status,
        tier: spec.tier,
        score: spec.score,
        qualification: spec.qualification,
      },
      create: {
        workspaceId: workspace.id,
        externalId: spec.externalId,
        source: spec.source,
        name: spec.name,
        phone: spec.phone,
        email: spec.email,
        status: spec.status,
        tier: spec.tier,
        score: spec.score,
        qualification: spec.qualification,
        sourcePayload: spec.sourcePayload,
        createdAt,
        updatedAt: createdAt,
      },
    });
    leadIdsBySlug[spec.externalId] = lead.id;

    // Consent
    const consentStatus = spec.status === LeadStatus.OPT_OUT ? ConsentStatus.OPTED_OUT : ConsentStatus.OPTED_IN;
    await prisma.consentRecord.upsert({
      where: { id: `demo-consent-${spec.externalId}` },
      update: { status: consentStatus },
      create: {
        id: `demo-consent-${spec.externalId}`,
        workspaceId: workspace.id,
        leadId: lead.id,
        phone: spec.phone,
        channel: ConsentChannel.SMS,
        status: consentStatus,
        consentSource: spec.source.toLowerCase(),
      },
    });

    // Conversation + messages (for leads in CONVERSATION_TEMPLATES)
    const template = CONVERSATION_TEMPLATES[spec.externalId];
    if (template) {
      const conv = await prisma.conversation.upsert({
        where: { id: `demo-conv-${spec.externalId}` },
        update: {},
        create: {
          id: `demo-conv-${spec.externalId}`,
          workspaceId: workspace.id,
          leadId: lead.id,
          channel: Channel.SMS,
          status: spec.status === LeadStatus.OPT_OUT ? ConversationStatus.CLOSED : ConversationStatus.AI_ACTIVE,
          aiActive: spec.status !== LeadStatus.OPT_OUT,
          fromNumber: spec.phone,
          toNumber: '+15550000000',
          createdAt,
          updatedAt: createdAt,
        },
      });

      // Replace existing messages to keep idempotent
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      for (const m of template) {
        const ts = new Date(createdAt.getTime() + m.minutesAfterStart * 60_000);
        await prisma.message.create({
          data: {
            workspaceId: workspace.id,
            conversationId: conv.id,
            role: m.role,
            content: m.content,
            aiMetadata: m.role === MessageRole.AI ? {
              model: 'gemini-1.5-flash-001',
              promptTokens: 420,
              completionTokens: 80,
              latencyMs: 850,
              tcpaChecked: true,
              fairHousingChecked: true,
            } : undefined,
            deliveredAt: ts,
            createdAt: ts,
          },
        });
      }
    }
  }

  // Appointments — 3 leads
  const appointmentSpecs = [
    { leadSlug: 'demo-lead-001', status: AppointmentStatus.CONFIRMED, daysFromNow: 1, notes: 'Private showing — 123 Oak Lane' },
    { leadSlug: 'demo-lead-002', status: AppointmentStatus.PENDING_CONFIRMATION, daysFromNow: 3, notes: 'Listing consultation' },
    { leadSlug: 'demo-lead-005', status: AppointmentStatus.COMPLETED, daysFromNow: -7, notes: 'Westlake tour — converted' },
  ];
  for (const a of appointmentSpecs) {
    const leadId = leadIdsBySlug[a.leadSlug];
    if (!leadId) continue;
    const scheduledAt = daysAgo(-a.daysFromNow);
    await prisma.appointment.upsert({
      where: { id: `demo-appt-${a.leadSlug}` },
      update: { status: a.status },
      create: {
        id: `demo-appt-${a.leadSlug}`,
        workspaceId: workspace.id,
        leadId,
        status: a.status,
        scheduledAt,
        durationMinutes: 60,
        timezone: 'America/Chicago',
        notes: a.notes,
        workspaceUserId: workspaceUser.id,
        completedAt: a.status === AppointmentStatus.COMPLETED ? scheduledAt : null,
      },
    });
  }

  // LeadEvents — 15 across the leads
  type EventSpec = { leadSlug: string; type: string; payload: Record<string, unknown> };
  const events: EventSpec[] = [
    { leadSlug: 'demo-lead-001', type: 'lead.created', payload: { source: 'ZILLOW' } },
    { leadSlug: 'demo-lead-001', type: 'lead.qualified', payload: { score: 82 } },
    { leadSlug: 'demo-lead-001', type: 'appointment.scheduled', payload: {} },
    { leadSlug: 'demo-lead-002', type: 'lead.created', payload: { source: 'WEB_FORM' } },
    { leadSlug: 'demo-lead-002', type: 'lead.qualified', payload: { score: 58 } },
    { leadSlug: 'demo-lead-003', type: 'lead.created', payload: { source: 'REALTOR_COM' } },
    { leadSlug: 'demo-lead-003', type: 'lead.contacted', payload: {} },
    { leadSlug: 'demo-lead-004', type: 'lead.created', payload: { source: 'MISSED_CALL' } },
    { leadSlug: 'demo-lead-004', type: 'lead.contacted', payload: { channel: 'SMS' } },
    { leadSlug: 'demo-lead-005', type: 'lead.created', payload: { source: 'ZILLOW' } },
    { leadSlug: 'demo-lead-005', type: 'lead.qualified', payload: { score: 95 } },
    { leadSlug: 'demo-lead-005', type: 'lead.converted', payload: { value: 1200000 } },
    { leadSlug: 'demo-lead-006', type: 'lead.created', payload: { source: 'WEB_FORM' } },
    { leadSlug: 'demo-lead-007', type: 'lead.dormant', payload: { daysInactive: 45 } },
    { leadSlug: 'demo-lead-008', type: 'lead.opted_out', payload: { keyword: 'STOP' } },
  ];
  let seq = 0;
  for (const e of events) {
    const leadId = leadIdsBySlug[e.leadSlug];
    if (!leadId) continue;
    seq += 1;
    await prisma.leadEvent.upsert({
      where: { leadId_sequence: { leadId, sequence: seq } },
      update: {},
      create: {
        workspaceId: workspace.id,
        leadId,
        sequence: seq,
        type: e.type,
        payload: e.payload,
      },
    });
  }

  // OperationalMetric — 30 days
  const metricNames = [
    { metric: 'leads.created', unit: 'count', baseline: 8, variance: 4 },
    { metric: 'leads.qualified', unit: 'count', baseline: 5, variance: 3 },
    { metric: 'response.latency.p95', unit: 'ms', baseline: 1800, variance: 600 },
    { metric: 'ai.tokens.used', unit: 'tokens', baseline: 45000, variance: 12000 },
  ];
  for (let d = 29; d >= 0; d -= 1) {
    const recordedAt = daysAgo(d);
    for (const m of metricNames) {
      const value = Math.max(0, m.baseline + Math.round((Math.random() - 0.5) * 2 * m.variance));
      await prisma.operationalMetric.create({
        data: {
          workspaceId: workspace.id,
          metric: m.metric,
          value,
          unit: m.unit,
          tags: { source: 'seed-demo' },
          recordedAt,
          createdAt: recordedAt,
        },
      });
    }
  }

  // RoutingRules — 4 strategies
  const routingSpecs = [
    { name: 'Spanish speakers → bilingual agents', strategy: RoutingStrategy.LANGUAGE, priority: 100, conditions: { language: 'es' } },
    { name: 'Austin metro → local team', strategy: RoutingStrategy.GEOGRAPHY, priority: 80, conditions: { area: ['Austin', 'Round Rock', 'Cedar Park'] } },
    { name: 'Top closers get HOT leads', strategy: RoutingStrategy.PERFORMANCE_BASED, priority: 60, conditions: { tier: 'HOT' } },
    { name: 'Default round-robin', strategy: RoutingStrategy.ROUND_ROBIN, priority: 0, conditions: {} },
  ];
  for (const r of routingSpecs) {
    await prisma.routingRule.upsert({
      where: { id: `demo-routing-${r.strategy}` },
      update: { name: r.name, priority: r.priority, conditions: r.conditions },
      create: {
        id: `demo-routing-${r.strategy}`,
        workspaceId: workspace.id,
        name: r.name,
        strategy: r.strategy,
        priority: r.priority,
        isActive: true,
        conditions: r.conditions,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Demo seed complete:
  - workspace: ${workspace.slug} (${workspace.id})
  - owner: ${OWNER_EMAIL}
  - leads: ${LEADS.length}
  - conversations: ${Object.keys(CONVERSATION_TEMPLATES).length}
  - appointments: ${appointmentSpecs.length}
  - lead events: ${events.length}
  - operational metrics: ${30 * metricNames.length}
  - routing rules: ${routingSpecs.length}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
