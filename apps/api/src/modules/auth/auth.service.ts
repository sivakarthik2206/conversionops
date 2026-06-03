import { Injectable } from '@nestjs/common';
import { generateMagicLinkToken, verifyMagicLinkToken, signToken } from '@conversionops/auth';
import { ResendClient } from '@conversionops/integrations';
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

  /**
   * Generates and emails a magic link for the given email address.
   * Never reveals whether an account exists (security invariant).
   */
  async sendMagicLink(email: string): Promise<Result<void>> {
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) return { ok: false, error: new Error('MAGIC_LINK_SECRET not configured') };

    const token = generateMagicLinkToken(email, secret);
    const appUrl = process.env['APP_URL'] ?? process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

    const emailResult = await this.resend.sendMagicLink(email, token, appUrl);
    if (!emailResult.ok) {
      logger.error({ err: emailResult.error, email }, 'Failed to send magic link email');
      return emailResult;
    }

    logger.info({ email }, 'Magic link sent');
    return { ok: true, value: undefined };
  }

  /**
   * Verifies a magic link token, upserts the user, and returns a signed JWT.
   * Returns err if token is invalid or expired.
   */
  async verifyMagicLink(token: string, workspaceSlug?: string): Promise<Result<AuthenticatedSession>> {
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) return { ok: false, error: new Error('MAGIC_LINK_SECRET not configured') };

    const verifyResult = verifyMagicLinkToken(token, secret);
    if (!verifyResult.ok) {
      logger.error(
        { reason: verifyResult.error.message, tokenLength: token.length },
        'Magic link verification failed',
      );
      return { ok: false, error: verifyResult.error };
    }

    const { email } = verifyResult.value;

    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, emailVerified: true, lastLoginAt: new Date() },
      update: { emailVerified: true, lastLoginAt: new Date() },
    });

    const workspaceUser = await this.findWorkspaceUser(user.id, workspaceSlug);
    if (!workspaceUser) {
      return { ok: false, error: new Error('No workspace access found for this account') };
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) return { ok: false, error: new Error('JWT_SECRET not configured') };

    const jwt = signToken(
      { userId: user.id, workspaceId: workspaceUser.workspaceId, role: workspaceUser.role },
      jwtSecret,
      '7d',
    );

    return {
      ok: true,
      value: {
        jwt,
        user: { id: user.id, email: user.email, name: user.name },
        workspaceUser,
      },
    };
  }

  private async findWorkspaceUser(userId: string, workspaceSlug?: string): Promise<WorkspaceUser | null> {
    if (workspaceSlug) {
      const workspace = await this.prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
      if (!workspace) return null;
      return this.prisma.workspaceUser.findFirst({
        where: { userId, workspaceId: workspace.id, isActive: true, deletedAt: null },
      });
    }

    return this.prisma.workspaceUser.findFirst({
      where: { userId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
