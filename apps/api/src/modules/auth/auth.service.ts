import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { generateMagicLinkToken, verifyMagicLinkToken, signToken } from '@conversionops/auth';
import { ResendClient } from '@conversionops/integrations';
import { UnauthorizedError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import type { User, WorkspaceUser } from '@conversionops/db';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedSession {
  jwt: string;
  user: Pick<User, 'id' | 'email' | 'name'>;
  workspaceUser: WorkspaceUser;
}

@Injectable()
export class AuthService {
  private readonly resend: ResendClient;

  constructor(private readonly prisma: PrismaService) {
    this.resend = new ResendClient(process.env['RESEND_API_KEY'] ?? '');
  }

  async sendMagicLink(email: string): Promise<Result<void>> {
    const normalizedEmail = email.toLowerCase().trim();
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) {
      logger.error({}, 'MAGIC_LINK_SECRET not configured');
      return { ok: true, value: undefined }; // silent — never reveal config errors to caller
    }

    try {
      // Upsert user so they exist before the token is stored
      const user = await this.prisma.user.upsert({
        where: { email: normalizedEmail },
        create: { email: normalizedEmail, emailVerified: false },
        update: {},
      });

      // Get or create workspace so we have a name for the email
      let workspaceName = 'ConversionOps';
      const existingWU = await this.prisma.workspaceUser.findFirst({
        where: { userId: user.id, isActive: true, deletedAt: null },
        include: { workspace: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!existingWU) {
        const username = normalizedEmail.split('@')[0] ?? 'user';
        const suffix = randomBytes(2).toString('hex');
        const slug = `${username}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const workspace = await this.prisma.workspace.create({
          data: { name: `${username}'s workspace`, slug, ownerEmail: normalizedEmail },
        });
        await this.prisma.workspaceUser.create({
          data: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
        });
        workspaceName = workspace.name;
      } else {
        workspaceName = existingWU.workspace.name;
      }

      // Generate token and store its hash so it can only be used once
      const token = generateMagicLinkToken(normalizedEmail, secret);
      const tokenHash = createHash('sha256').update(token).digest('hex');

      await this.prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          magicLinkToken: tokenHash,
          magicLinkExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const appUrl = (
        process.env['APP_URL'] ??
        process.env['NEXT_PUBLIC_APP_URL'] ??
        'https://app.conversionops.in'
      ).replace(/\/$/, '');
      const link = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;

      const emailResult = await this.resend.sendMagicLink(normalizedEmail, link, workspaceName);
      if (!emailResult.ok) {
        logger.error({ err: emailResult.error, email: normalizedEmail }, 'Failed to send magic link email');
      }

      logger.info({ email: normalizedEmail, tokenLength: token.length }, 'Magic link sent');
    } catch (err) {
      logger.error({ err, email: normalizedEmail }, 'sendMagicLink error');
    }

    // Always return ok — never reveal whether an account exists
    return { ok: true, value: undefined };
  }

  async verifyMagicLink(token: string): Promise<Result<AuthenticatedSession>> {
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) return { ok: false, error: new Error('MAGIC_LINK_SECRET not configured') };

    // 1. Verify HMAC signature and extract email
    const verifyResult = verifyMagicLinkToken(token, secret);
    if (!verifyResult.ok) {
      logger.error({ reason: verifyResult.error.message, tokenLength: token.length }, 'Token verification failed');
      return { ok: false, error: verifyResult.error };
    }

    const { email } = verifyResult.value;

    // 2. Load user
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, error: new UnauthorizedError('Invalid token') };
    }

    // 3. Check stored hash matches (replay protection)
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (!user.magicLinkToken || user.magicLinkToken !== tokenHash) {
      logger.error({ email, hasStoredToken: !!user.magicLinkToken }, 'Token hash mismatch or already used');
      return { ok: false, error: new UnauthorizedError('Token already used or invalid') };
    }

    // 4. Check DB-level expiry (belt-and-suspenders on top of HMAC exp)
    if (!user.magicLinkExpiresAt || user.magicLinkExpiresAt < new Date()) {
      return { ok: false, error: new UnauthorizedError('Token expired') };
    }

    // 5. Consume token (one-time use)
    await this.prisma.user.update({
      where: { email },
      data: {
        magicLinkToken: null,
        magicLinkExpiresAt: null,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    // 6. Load or create workspace membership
    const workspaceUser = await this.findOrCreateWorkspaceUser(user.id, email);

    // 7. Issue JWT
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) return { ok: false, error: new Error('JWT_SECRET not configured') };

    const jwt = signToken(
      { userId: user.id, workspaceId: workspaceUser.workspaceId, role: workspaceUser.role },
      jwtSecret,
      '7d',
    );

    logger.info({ userId: user.id, workspaceId: workspaceUser.workspaceId }, 'Magic link verified, JWT issued');

    return {
      ok: true,
      value: {
        jwt,
        user: { id: user.id, email: user.email, name: user.name },
        workspaceUser,
      },
    };
  }

  private async findOrCreateWorkspaceUser(userId: string, email: string): Promise<WorkspaceUser> {
    const existing = await this.prisma.workspaceUser.findFirst({
      where: { userId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    const username = email.split('@')[0] ?? 'user';
    const suffix = randomBytes(2).toString('hex');
    const slug = `${username}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const workspace = await this.prisma.workspace.create({
      data: { name: `${username}'s workspace`, slug, ownerEmail: email },
    });

    return this.prisma.workspaceUser.create({
      data: { workspaceId: workspace.id, userId, role: 'OWNER' },
    });
  }
}
