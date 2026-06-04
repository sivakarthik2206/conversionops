import { randomBytes } from 'crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { signToken } from '@conversionops/auth';
import { ResendClient } from '@conversionops/integrations';
import { UnauthorizedError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import type { User, WorkspaceUser } from '@conversionops/db';
import { PrismaService } from '../prisma/prisma.service';

export interface WorkspaceInfo {
  id: string;
  name: string;
  plan: string;
  status: string;
}

export interface AuthenticatedSession {
  jwt: string;
  user: Pick<User, 'id' | 'email' | 'name'>;
  workspace: WorkspaceInfo;
}

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';

function generateTempPassword(): string {
  return Array.from(randomBytes(12))
    .map(b => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length])
    .join('');
}

@Injectable()
export class AuthService {
  private readonly resend: ResendClient;

  constructor(private readonly prisma: PrismaService) {
    this.resend = new ResendClient(process.env['RESEND_API_KEY'] ?? '');
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

      const workspaceUser = await this.prisma.workspaceUser.findFirst({
        where: { userId: user.id, isActive: true, deletedAt: null },
        include: { workspace: { select: { id: true, name: true, plan: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      });

      if (!workspaceUser) {
        return { ok: false, error: new UnauthorizedError('No workspace found for this account') };
      }

      const jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) return { ok: false, error: new Error('JWT_SECRET not configured') };

      const jwt = signToken(
        {
          userId: user.id,
          workspaceId: workspaceUser.workspaceId,
          role: workspaceUser.role,
          plan: workspaceUser.workspace.plan,
          status: workspaceUser.workspace.status,
        },
        jwtSecret,
        '7d',
      );

      logger.info({ userId: user.id, workspaceId: workspaceUser.workspaceId }, 'Password login successful');

      return {
        ok: true,
        value: {
          jwt,
          user: { id: user.id, email: user.email, name: user.name },
          workspace: {
            id: workspaceUser.workspace.id,
            name: workspaceUser.workspace.name,
            plan: workspaceUser.workspace.plan,
            status: workspaceUser.workspace.status,
          },
        },
      };
    } catch (err) {
      logger.error({ err, email: normalizedEmail }, 'loginWithPassword error');
      return { ok: false, error: new UnauthorizedError('Invalid credentials') };
    }
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

  async createAccountWithPassword(
    email: string,
    name: string,
    role: 'ADMIN' | 'AGENT' | 'VIEWER',
    workspaceId: string,
  ): Promise<Result<{ tempPassword: string }>> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      if (!workspace) return { ok: false, error: new Error('Workspace not found') };

      const tempPassword = generateTempPassword();
      const hash = await bcrypt.hash(tempPassword, 12);

      const user = await this.prisma.user.upsert({
        where: { email: normalizedEmail },
        create: { email: normalizedEmail, name, passwordHash: hash, emailVerified: true },
        update: { name, passwordHash: hash },
      });

      const existing = await this.prisma.workspaceUser.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } },
      });

      if (!existing) {
        await this.prisma.workspaceUser.create({
          data: { workspaceId, userId: user.id, role, isActive: true },
        });
      } else {
        await this.prisma.workspaceUser.update({
          where: { id: existing.id },
          data: { role, isActive: true, deletedAt: null },
        });
      }

      const appUrl = (process.env['APP_URL'] ?? 'https://app.conversionops.in').replace(/\/$/, '');

      await this.resend.sendWelcomeWithPassword(
        normalizedEmail,
        name || (normalizedEmail.split('@')[0] ?? 'there'),
        workspace.name,
        tempPassword,
        appUrl,
      );

      logger.info({ email: normalizedEmail, workspaceId }, 'Account created with temp password');
      return { ok: true, value: { tempPassword } };
    } catch (err) {
      logger.error({ err, email: normalizedEmail }, 'createAccountWithPassword error');
      return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
