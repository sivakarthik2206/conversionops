// Run after seed:admin to populate dashboard with demo data
// Command: pnpm --filter @conversionops/db run seed:demo
import {
  PrismaClient,
  LeadSource,
  LeadStatus,
  LeadTier,
  ConversationStatus,
  Channel,
  MessageRole,
  AppointmentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const workspace = await prisma.workspace.findFirstOrThrow({
    where: { OR: [{ slug: 'conversionops-admin' }, {}] },
    orderBy: { createdAt: 'asc' },
  });

  function daysFromNow(d: number): Date {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt;
  }

  function daysAgo(d: number): Date {
    return daysFromNow(-d);
  }

  // Lead 1 — Marcus Johnson: PRIORITY tier, appointment scheduled
  const lead1 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-marcus-johnson' } },
    update: { status: LeadStatus.APPOINTMENT_SCHEDULED, tier: LeadTier.PRIORITY, score: 87 },
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-marcus-johnson',
      source: LeadSource.ZILLOW,
      name: 'Marcus Johnson',
      phone: '+15551234001',
      status: LeadStatus.APPOINTMENT_SCHEDULED,
      tier: LeadTier.PRIORITY,
      score: 87,
      qualification: {
        budget: '$450-550k',
        timeline: '30-60 days',
        financing: 'Pre-approved',
        area: 'Coral Gables',
        propertyType: 'Single family',
        urgency: 'High',
      },
    },
  });

  const conv1 = await prisma.conversation.upsert({
    where: { id: 'demo-conv-marcus-johnson' },
    update: {},
    create: {
      id: 'demo-conv-marcus-johnson',
      workspaceId: workspace.id,
      leadId: lead1.id,
      channel: Channel.SMS,
      status: ConversationStatus.AI_ACTIVE,
      aiActive: true,
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv1.id } });
  const conv1Messages = [
    { role: MessageRole.HUMAN, content: "Hi, I saw a listing on Zillow in Coral Gables. Still available?", minutesAgo: 60 },
    { role: MessageRole.AI,    content: "Hi Marcus! Yes, we have several properties available in Coral Gables right now. Are you pre-approved, and what's your budget range?", minutesAgo: 59 },
    { role: MessageRole.HUMAN, content: "Pre-approved up to $550k. Looking for a single family, 3 bed+.", minutesAgo: 55 },
    { role: MessageRole.AI,    content: "Perfect — that gives us great options. What's your timeline? Are you looking to close in 30, 60, or 90 days?", minutesAgo: 54 },
    { role: MessageRole.HUMAN, content: "Ideally 30-60 days. We're ready to move.", minutesAgo: 50 },
    { role: MessageRole.AI,    content: "Excellent — I'll have Alex reach out to schedule a private showing. What time works best for you tomorrow?", minutesAgo: 49 },
  ];
  for (const m of conv1Messages) {
    const createdAt = daysAgo(0);
    createdAt.setMinutes(createdAt.getMinutes() - m.minutesAgo);
    await prisma.message.create({
      data: { workspaceId: workspace.id, conversationId: conv1.id, role: m.role, content: m.content, createdAt },
    });
  }

  await prisma.appointment.upsert({
    where: { id: 'demo-appt-marcus-johnson' },
    update: { status: AppointmentStatus.CONFIRMED },
    create: {
      id: 'demo-appt-marcus-johnson',
      workspaceId: workspace.id,
      leadId: lead1.id,
      status: AppointmentStatus.CONFIRMED,
      scheduledAt: daysFromNow(1),
      durationMinutes: 60,
      timezone: workspace.timezone,
      notes: 'Private showing — Coral Gables properties',
    },
  });

  // Lead 2 — Sarah Chen: HOT tier, mid-qualification
  const lead2 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-sarah-chen' } },
    update: { status: LeadStatus.QUALIFYING, tier: LeadTier.HOT, score: 72 },
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-sarah-chen',
      source: LeadSource.MISSED_CALL,
      name: 'Sarah Chen',
      phone: '+15551234002',
      status: LeadStatus.QUALIFYING,
      tier: LeadTier.HOT,
      score: 72,
      qualification: {},
    },
  });

  const conv2 = await prisma.conversation.upsert({
    where: { id: 'demo-conv-sarah-chen' },
    update: {},
    create: {
      id: 'demo-conv-sarah-chen',
      workspaceId: workspace.id,
      leadId: lead2.id,
      channel: Channel.SMS,
      status: ConversationStatus.AI_ACTIVE,
      aiActive: true,
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv2.id } });
  const conv2Messages = [
    { role: MessageRole.AI,    content: "Hi Sarah! You just called our office — this is the AI assistant. Are you looking to buy or sell in the area?", minutesAgo: 120 },
    { role: MessageRole.HUMAN, content: "Hi yes, looking to buy. Missed the call sorry.", minutesAgo: 115 },
    { role: MessageRole.AI,    content: "No worries at all! What area and price range are you considering?", minutesAgo: 114 },
    { role: MessageRole.HUMAN, content: "Somewhere in Miami, budget around $400k. Need 3 bedrooms.", minutesAgo: 110 },
  ];
  for (const m of conv2Messages) {
    const createdAt = daysAgo(0);
    createdAt.setMinutes(createdAt.getMinutes() - m.minutesAgo);
    await prisma.message.create({
      data: { workspaceId: workspace.id, conversationId: conv2.id, role: m.role, content: m.content, createdAt },
    });
  }

  // Lead 3 — David Rodriguez: WARM tier, just started
  const lead3 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-david-rodriguez' } },
    update: { status: LeadStatus.CONTACTED, tier: LeadTier.WARM, score: 45 },
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-david-rodriguez',
      source: LeadSource.WEB_FORM,
      name: 'David Rodriguez',
      phone: '+15551234003',
      status: LeadStatus.CONTACTED,
      tier: LeadTier.WARM,
      score: 45,
      qualification: {},
    },
  });

  const conv3 = await prisma.conversation.upsert({
    where: { id: 'demo-conv-david-rodriguez' },
    update: {},
    create: {
      id: 'demo-conv-david-rodriguez',
      workspaceId: workspace.id,
      leadId: lead3.id,
      channel: Channel.SMS,
      status: ConversationStatus.AI_ACTIVE,
      aiActive: true,
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv3.id } });
  const conv3Messages = [
    { role: MessageRole.AI,    content: "Hi David! Thanks for reaching out through our website. What can I help you with today?", minutesAgo: 30 },
    { role: MessageRole.HUMAN, content: "Just browsing for now. Maybe looking to buy in 6 months.", minutesAgo: 25 },
  ];
  for (const m of conv3Messages) {
    const createdAt = daysAgo(0);
    createdAt.setMinutes(createdAt.getMinutes() - m.minutesAgo);
    await prisma.message.create({
      data: { workspaceId: workspace.id, conversationId: conv3.id, role: m.role, content: m.content, createdAt },
    });
  }

  // Lead 4 — Jennifer Kim: COLD tier, unresponsive
  const lead4 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-jennifer-kim' } },
    update: { status: LeadStatus.UNRESPONSIVE, tier: LeadTier.COLD, score: 18 },
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-jennifer-kim',
      source: LeadSource.ZILLOW,
      name: 'Jennifer Kim',
      phone: '+15551234004',
      status: LeadStatus.UNRESPONSIVE,
      tier: LeadTier.COLD,
      score: 18,
      qualification: {},
    },
  });

  const conv4 = await prisma.conversation.upsert({
    where: { id: 'demo-conv-jennifer-kim' },
    update: {},
    create: {
      id: 'demo-conv-jennifer-kim',
      workspaceId: workspace.id,
      leadId: lead4.id,
      channel: Channel.SMS,
      status: ConversationStatus.DORMANT,
      aiActive: false,
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv4.id } });
  const createdAt4 = daysAgo(3);
  await prisma.message.create({
    data: {
      workspaceId: workspace.id,
      conversationId: conv4.id,
      role: MessageRole.AI,
      content: "Hi Jennifer! I noticed you were looking at listings in Coral Gables on Zillow. Are you in the market to buy? I can answer questions right now.",
      createdAt: createdAt4,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Demo seed complete — workspace: ${workspace.slug} (${workspace.id})
  - Marcus Johnson: PRIORITY / score 87 / appointment tomorrow
  - Sarah Chen: HOT / score 72 / qualifying
  - David Rodriguez: WARM / score 45 / contacted
  - Jennifer Kim: COLD / score 18 / unresponsive`);
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
