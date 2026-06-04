import { createHash, randomBytes } from 'crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
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
  hasPassword: boolean;
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
      return { ok: true, value: undefined };
    }

    try {
      const user = await this.prisma.user.upsert({
        where: { email: normalizedEmail },
        create: { email: normalizedEmail, emailVerified: false },
        update: {},
      });

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

    return { ok: true, value: undefined };
  }

  async verifyMagicLink(token: string): Promise<Result<AuthenticatedSession>> {
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) return { ok: false, error: new Error('MAGIC_LINK_SECRET not configured') };

    const verifyResult = verifyMagicLinkToken(token, secret);
    if (!verifyResult.ok) {
      logger.error({ reason: verifyResult.error.message, tokenLength: token.length }, 'Token verification failed');
      return { ok: false, error: verifyResult.error };
    }

    const { email } = verifyResult.value;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, error: new UnauthorizedError('Invalid token') };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (!user.magicLinkToken || user.magicLinkToken !== tokenHash) {
      logger.error({ email, hasStoredToken: !!user.magicLinkToken }, 'Token hash mismatch or already used');
      return { ok: false, error: new UnauthorizedError('Token already used or invalid') };
    }

    if (!user.magicLinkExpiresAt || user.magicLinkExpiresAt < new Date()) {
      return { ok: false, error: new UnauthorizedError('Token expired') };
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        magicLinkToken: null,
        magicLinkExpiresAt: null,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    const workspaceUser = await this.findOrCreateWorkspaceUser(user.id, email);

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
        hasPassword: !!user.passwordHash,
      },
    };
  }

  async setPassword(userId: string, password: string): Promise<Result<void>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { ok: false, error: new Error('User not found') };

      const hash = await bcrypt.hash(password, 12);
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hash },
      });

      logger.info({ userId }, 'Password set');
      return { ok: true, value: undefined };
    } catch (err) {
      logger.error({ err, userId }, 'setPassword error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async loginWithPassword(email: string, password: string): Promise<Result<AuthenticatedSession>> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user || !user.passwordHash) {
        return { ok: false, error: new UnauthorizedError('Invalid credentials') };
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return { ok: false, error: new UnauthorizedError('Invalid credentials') };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const workspaceUser = await this.findOrCreateWorkspaceUser(user.id, normalizedEmail);

      const jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) return { ok: false, error: new Error('JWT_SECRET not configured') };

      const jwt = signToken(
        { userId: user.id, workspaceId: workspaceUser.workspaceId, role: workspaceUser.role },
        jwtSecret,
        '7d',
      );

      logger.info({ userId: user.id }, 'Password login successful');

      return {
        ok: true,
        value: {
          jwt,
          user: { id: user.id, email: user.email, name: user.name },
          workspaceUser,
          hasPassword: true,
        },
      };
    } catch (err) {
      logger.error({ err, email: normalizedEmail }, 'loginWithPassword error');
      return { ok: false, error: new UnauthorizedError('Invalid credentials') };
    }
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) return; // silent — prevent email enumeration

      const resetToken = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const appUrl = (
        process.env['APP_URL'] ??
        process.env['NEXT_PUBLIC_APP_URL'] ??
        'https://app.conversionops.in'
      ).replace(/\/$/, '');
      const link = `${appUrl}/auth/reset-password?token=${resetToken}`;

      await this.resend.sendPasswordReset(normalizedEmail, link);
      logger.info({ email: normalizedEmail }, 'Password reset email sent');
    } catch (err) {
      logger.error({ err, email: normalizedEmail }, 'initiatePasswordReset error');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<Result<void>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
      if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
        return { ok: false, error: new BadRequestException('Reset link is invalid or has expired') };
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });

      logger.info({ userId: user.id }, 'Password reset complete');
      return { ok: true, value: undefined };
    } catch (err) {
      if (err instanceof BadRequestException) return { ok: false, error: err };
      logger.error({ err }, 'resetPassword error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
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
