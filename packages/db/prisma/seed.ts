import { PrismaClient, Plan, WorkspaceStatus, UserRole, LeadSource, LeadStatus, LeadTier, ConsentStatus, ConsentChannel } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-brokerage' },
    update: {},
    create: {
      name: 'Demo Brokerage',
      slug: 'demo-brokerage',
      plan: Plan.BROKERAGE,
      status: WorkspaceStatus.ACTIVE,
      ownerEmail: 'owner@demo-brokerage.com',
      timezone: 'America/New_York',
      onboardingCompletedAt: new Date(),
      aiConfig: {
        agentName: 'Alex',
        tone: 'professional and warm',
        customInstructions: '',
      },
    },
  });

  // Owner user
  const user = await prisma.user.upsert({
    where: { email: 'owner@demo-brokerage.com' },
    update: {},
    create: {
      email: 'owner@demo-brokerage.com',
      name: 'Demo Owner',
      emailVerified: true,
    },
  });

  // WorkspaceUser linking owner to workspace
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: UserRole.OWNER,
      displayName: 'Demo Owner',
      isActive: true,
    },
  });

  // Sample leads
  const lead1 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-lead-001' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-lead-001',
      source: LeadSource.ZILLOW,
      name: 'Jane Smith',
      phone: '+15551234567',
      email: 'jane.smith@example.com',
      status: LeadStatus.QUALIFYING,
      tier: LeadTier.WARM,
      score: 35,
      qualification: {
        intent: 'buy',
        area: 'Austin, TX',
        budget: '$500k',
        timeline: '90_days',
      },
      sourcePayload: {
        propertyAddress: '123 Oak Lane, Austin TX 78701',
        listingId: 'zl-12345',
      },
    },
  });

  const lead2 = await prisma.lead.upsert({
    where: { workspaceId_externalId: { workspaceId: workspace.id, externalId: 'demo-lead-002' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      externalId: 'demo-lead-002',
      source: LeadSource.WEB_FORM,
      name: 'Bob Johnson',
      phone: '+15559876543',
      email: 'bob.johnson@example.com',
      status: LeadStatus.NEW,
      tier: LeadTier.COLD,
      score: 5,
      qualification: {},
      sourcePayload: { form: 'contact-us' },
    },
  });

  // Consent records for demo leads (TCPA: required before outbound SMS)
  await prisma.consentRecord.upsert({
    where: { id: 'demo-consent-001' },
    update: {},
    create: {
      id: 'demo-consent-001',
      workspaceId: workspace.id,
      leadId: lead1.id,
      phone: '+15551234567',
      channel: ConsentChannel.SMS,
      status: ConsentStatus.OPTED_IN,
      consentSource: 'zillow_inquiry',
    },
  });

  await prisma.consentRecord.upsert({
    where: { id: 'demo-consent-002' },
    update: {},
    create: {
      id: 'demo-consent-002',
      workspaceId: workspace.id,
      leadId: lead2.id,
      phone: '+15559876543',
      channel: ConsentChannel.SMS,
      status: ConsentStatus.OPTED_IN,
      consentSource: 'web_form',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed complete — workspace: ${workspace.id}, leads: ${lead1.id}, ${lead2.id}`);
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
