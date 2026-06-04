/**
 * Admin account seeding script — run ONCE manually.
 * NEVER runs automatically. NEVER hardcodes credentials.
 *
 * HOW TO RUN (PowerShell):
 *   $env:ADMIN_EMAIL="sivakarthik2206@gmail.com"
 *   $env:ADMIN_PASSWORD="your-secure-password-here"
 *   $env:ADMIN_NAME="Siva Karthik"
 *   $env:DATABASE_URL="postgresql://..."
 *   pnpm --filter @conversionops/db run seed:admin
 *
 * HOW TO RUN (bash):
 *   ADMIN_EMAIL="sivakarthik2206@gmail.com" \
 *   ADMIN_PASSWORD="your-secure-password-here" \
 *   ADMIN_NAME="Siva Karthik" \
 *   DATABASE_URL="postgresql://..." \
 *   pnpm --filter @conversionops/db run seed:admin
 *
 * IMPORTANT: After running, verify login at app.conversionops.in/login
 * NEVER commit ADMIN_PASSWORD to git.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} [y/N] `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const adminEmail = requireEnv('ADMIN_EMAIL');
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const adminName = requireEnv('ADMIN_NAME');
  const appUrl = process.env['APP_URL'] ?? 'https://app.conversionops.in';

  console.log(`\n🔧 ConversionOps Admin Seeding`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Name:  ${adminName}`);
  console.log(`   App:   ${appUrl}/login\n`);

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    const ok = await confirm(`⚠️  User ${adminEmail} already exists. Overwrite password?`);
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  // Hash password
  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      emailVerified: true,
    },
    update: {
      name: adminName,
      passwordHash,
      emailVerified: true,
    },
  });
  console.log(`✅ User upserted: ${user.id}`);

  // Find or create workspace
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'demo-brokerage' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'ConversionOps Admin',
        slug: 'conversionops-admin',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        ownerEmail: adminEmail,
      },
    });
    console.log(`✅ Workspace created: ${workspace.id}`);
  } else {
    console.log(`✅ Using workspace: ${workspace.name} (${workspace.id})`);
  }

  // Upsert workspace user
  const existing_wu = await prisma.workspaceUser.findFirst({
    where: { workspaceId: workspace.id, userId: user.id },
  });

  if (!existing_wu) {
    await prisma.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER',
        isActive: true,
      },
    });
  } else {
    await prisma.workspaceUser.update({
      where: { id: existing_wu.id },
      data: { role: 'OWNER', isActive: true, deletedAt: null },
    });
  }
  console.log(`✅ WorkspaceUser set as OWNER\n`);

  console.log(`🎉 Admin account ready.`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: [hidden — use the one you provided]`);
  console.log(`   Login at: ${appUrl}/login\n`);
}

main()
  .catch(err => {
    console.error('❌ seed-admin failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
