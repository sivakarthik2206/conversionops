import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const workspace = await db.workspace.upsert({
    where: { slug: "demo-brokerage" },
    update: {},
    create: {
      name: "Demo Brokerage",
      slug: "demo-brokerage",
      ownerEmail: "demo@conversionops.in",
      plan: "SOLO",
      status: "ACTIVE",
      aiConfig: {
        agentName: "Alex",
        tone: "professional",
        customInstructions: "",
        greetingTemplate: "Hi {leadName}! This is {agentName}. I saw you were interested in {propertyArea} — how can I help?",
      },
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
  });

  console.log("Seeded workspace:", workspace.slug);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
