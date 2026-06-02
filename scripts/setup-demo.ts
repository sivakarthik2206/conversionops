/**
 * setup-demo.ts — Creates a complete Miami Premier Realty demo workspace.
 *
 * Idempotent: safe to run multiple times.
 * Run: npx tsx scripts/setup-demo.ts
 */
import { PrismaClient, Plan, WorkspaceStatus, UserRole, LeadSource, LeadStatus, LeadTier, ConversationStatus, Channel, MessageRole, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env['DATABASE_URL'] });

const SLUG = 'miami-premier-demo';
const OWNER_EMAIL = 'demo@conversionops.in';

const LEADS = [
  { ext: 'mpd-001', name: 'Sarah Mitchell',   phone: '+13055551001', email: 'sarah.mitchell@gmail.com', source: LeadSource.ZILLOW,       status: LeadStatus.APPOINTMENT_SCHEDULED, score: 87, tier: LeadTier.PRIORITY,    daysAgo: 3  },
  { ext: 'mpd-002', name: 'Marcus Johnson',   phone: '+13055551002', email: null,                       source: LeadSource.MISSED_CALL,  status: LeadStatus.QUALIFYING,            score: 62, tier: LeadTier.HOT,         daysAgo: 1  },
  { ext: 'mpd-003', name: 'Jennifer Walsh',   phone: '+13055551003', email: null,                       source: LeadSource.WEB_FORM,     status: LeadStatus.QUALIFIED,             score: 74, tier: LeadTier.HOT,         daysAgo: 2  },
  { ext: 'mpd-004', name: 'David Chen',       phone: '+13055551004', email: null,                       source: LeadSource.ZILLOW,       status: LeadStatus.CONTACTED,             score: 45, tier: LeadTier.WARM,        daysAgo: 4  },
  { ext: 'mpd-005', name: 'Maria Garcia',     phone: '+13055551005', email: null,                       source: LeadSource.ZILLOW,       status: LeadStatus.NEW,                   score: 0,  tier: LeadTier.UNQUALIFIED, daysAgo: 0  },
  { ext: 'mpd-006', name: 'Robert Kim',       phone: '+13055551006', email: null,                       source: LeadSource.MISSED_CALL,  status: LeadStatus.CONVERTED,             score: 91, tier: LeadTier.PRIORITY,    daysAgo: 10 },
  { ext: 'mpd-007', name: 'Ashley Thompson',  phone: '+13055551007', email: null,                       source: LeadSource.WEB_FORM,     status: LeadStatus.DORMANT,               score: 28, tier: LeadTier.COLD,        daysAgo: 20 },
  { ext: 'mpd-008', name: 'James Wilson',     phone: '+13055551008', email: null,                       source: LeadSource.ZILLOW,       status: LeadStatus.ASSIGNED,              score: 55, tier: LeadTier.WARM,        daysAgo: 5  },
  { ext: 'mpd-009', name: 'Emma Davis',       phone: '+13055551009', email: null,                       source: LeadSource.REALTOR_COM,  status: LeadStatus.QUALIFYING,            score: 68, tier: LeadTier.HOT,         daysAgo: 1  },
  { ext: 'mpd-010', name: 'Michael Brown',    phone: '+13055551010', email: null,                       source: LeadSource.ZILLOW,       status: LeadStatus.APPOINTMENT_REQUESTED, score: 79, tier: LeadTier.HOT,         daysAgo: 2  },
] as const;

const MESSAGES: Partial<Record<string, Array<{ role: MessageRole; content: string; min: number }>>> = {
  'mpd-001': [
    { role: MessageRole.AI,    content: "Hi Sarah! I'm Alex, AI assistant for Miami Premier Realty. I saw you were interested in a 3BR in Coral Gables — great choice! Are you looking to buy in the next 30–90 days, or just exploring your options?", min: 0 },
    { role: MessageRole.HUMAN, content: "We're hoping to move in about 60 days. Already pre-approved for $850k.", min: 8 },
    { role: MessageRole.AI,    content: "That's perfect timing! With $850k pre-approved, you'll have great options in Coral Gables. Are you also open to South Miami or Coconut Grove, or strictly Coral Gables?", min: 9 },
  ],
  'mpd-002': [
    { role: MessageRole.AI,    content: "Hi Marcus! You just called Miami Premier Realty and we missed you — I'm Alex, the AI assistant. Are you looking to buy or sell in Miami? I can help right now.", min: 0 },
    { role: MessageRole.HUMAN, content: "Looking to buy. Budget around 600k, need 4 beds.", min: 15 },
  ],
  'mpd-003': [
    { role: MessageRole.AI,    content: "Hi Jennifer! Thanks for reaching out through our website. I'm Alex with Miami Premier Realty. What area of Miami are you considering?", min: 0 },
    { role: MessageRole.HUMAN, content: "Brickell or downtown area preferably.", min: 5 },
    { role: MessageRole.AI,    content: "Great choice — Brickell has excellent inventory right now. What's your timeline and budget range?", min: 6 },
    { role: MessageRole.HUMAN, content: "Looking within 3 months, budget up to $900k, need 2 bed 2 bath.", min: 20 },
  ],
};

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

function offsetDays(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(d < 0 ? 10 : 14, 0, 0, 0);
  return dt;
}

async function main() {
  // ─── Workspace ──────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: SLUG },
    update: {
      twilioNumber: '+19129150550',
      aiConfig: { agentName: 'Alex', tone: 'friendly', calComUsername: 'conversionops-demo', followUpBossApiKey: 'demo-key' },
    },
    create: {
      name: 'Miami Premier Realty — Demo',
      slug: SLUG,
      plan: Plan.BROKERAGE,
      status: WorkspaceStatus.ACTIVE,
      ownerEmail: OWNER_EMAIL,
      timezone: 'America/New_York',
      twilioNumber: '+19129150550',
      onboardingCompletedAt: new Date(),
      aiConfig: { agentName: 'Alex', tone: 'friendly', calComUsername: 'conversionops-demo', followUpBossApiKey: 'demo-key' },
      aiPaused: false,
    },
  });

  // ─── Owner ───────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { emailVerified: true },
    create: { email: OWNER_EMAIL, name: 'Demo Owner', emailVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: UserRole.OWNER, isActive: true },
    create: { workspaceId: workspace.id, userId: user.id, role: UserRole.OWNER, displayName: 'Alex', isActive: true },
  });

  // ─── Leads + conversations ───────────────────────────────────────────────────
  const leadIds: Record<string, string> = {};

  for (const spec of LEADS) {
    const createdAt = daysAgo(spec.daysAgo);
    const lead = await prisma.lead.upsert({
      where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: spec.ext } },
      update: { status: spec.status, tier: spec.tier, score: spec.score },
      create: {
        workspaceId: workspace.id,
        externalId: spec.ext,
        source: spec.source,
        status: spec.status,
        tier: spec.tier,
        score: spec.score,
        name: spec.name,
        phone: spec.phone,
        ...(spec.email ? { email: spec.email } : {}),
        qualification: {},
        sourcePayload: {},
        createdAt,
        updatedAt: createdAt,
      },
    });
    leadIds[spec.ext] = lead.id;

    const msgs = MESSAGES[spec.ext];
    if (!msgs || msgs.length === 0) continue;

    let conv = await prisma.conversation.findFirst({ where: { workspaceId: workspace.id, leadId: lead.id, deletedAt: null } });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          channel: Channel.SMS,
          status: ConversationStatus.AI_ACTIVE,
          aiActive: true,
          escalationLevel: 'NONE',
          messageCount: msgs.length,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }

    for (const msg of msgs) {
      const msgId = `demo-${spec.ext}-m${msg.min}`;
      const exists = await prisma.message.findUnique({ where: { id: msgId } });
      if (!exists) {
        await prisma.message.create({
          data: {
            id: msgId,
            workspaceId: workspace.id,
            conversationId: conv.id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(createdAt.getTime() + msg.min * 60_000),
            updatedAt: new Date(createdAt.getTime() + msg.min * 60_000),
          },
        });
      }
    }
  }

  // ─── Appointments ─────────────────────────────────────────────────────────
  const appts: Array<{ id: string; leadExt: string; scheduledAt: Date; status: AppointmentStatus; externalBookingId?: string }> = [
    { id: 'demo-appt-001', leadExt: 'mpd-001', scheduledAt: offsetDays(1),  status: AppointmentStatus.CONFIRMED,            externalBookingId: 'demo-booking-1' },
    { id: 'demo-appt-002', leadExt: 'mpd-006', scheduledAt: offsetDays(-1), status: AppointmentStatus.COMPLETED },
    { id: 'demo-appt-003', leadExt: 'mpd-009', scheduledAt: offsetDays(2),  status: AppointmentStatus.PENDING_CONFIRMATION },
  ];

  for (const appt of appts) {
    const leadId = leadIds[appt.leadExt];
    if (!leadId) continue;
    const existing = await prisma.appointment.findUnique({ where: { id: appt.id } });
    if (!existing) {
      await prisma.appointment.create({
        data: {
          id: appt.id,
          workspaceId: workspace.id,
          leadId,
          status: appt.status,
          scheduledAt: appt.scheduledAt,
          timezone: 'America/New_York',
          durationMinutes: 60,
          ...(appt.externalBookingId ? { externalBookingId: appt.externalBookingId } : {}),
        },
      });
    }
  }

  // ─── 30 days of OperationalMetrics ───────────────────────────────────────
  const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  for (let i = 0; i < 30; i++) {
    const recordedAt = daysAgo(i);
    recordedAt.setHours(0, 0, 0, 0);
    const defs = [
      { metric: 'ai_response_p95',      value: rnd(2000, 4500), unit: 'ms'  },
      { metric: 'twilio_delivery_rate', value: rnd(94, 99),     unit: 'pct' },
      { metric: 'leads_per_day',        value: rnd(3, 12),      unit: 'count' },
      { metric: 'appointments_per_day', value: rnd(0, 3),       unit: 'count' },
    ];
    for (const d of defs) {
      const existing = await prisma.operationalMetric.findFirst({
        where: { workspaceId: workspace.id, metric: d.metric, recordedAt },
      });
      if (!existing) {
        await prisma.operationalMetric.create({
          data: { workspaceId: workspace.id, metric: d.metric, value: d.value, unit: d.unit, recordedAt },
        });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✓ Demo seeded: "${workspace.name}" (id: ${workspace.id})`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
