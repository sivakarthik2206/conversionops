import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { generateMagicLinkToken, verifyMagicLinkToken } from '@conversionops/auth';
import { signToken } from '@conversionops/auth';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import type { User } from '@conversionops/db';

export interface VerifyResult {
  jwt: string;
  user: Pick<User, 'id' | 'email' | 'name'>;
}

@Injectable()
export class AuthService {
  private readonly resend: Resend;

  constructor(private readonly prisma: PrismaService) {
    this.resend = new Resend(process.env['RESEND_API_KEY'] ?? '');
  }

  /**
   * Sends a magic-link email to the given address. Creates the user if they don't exist yet.
   * @param email - Recipient email address
   * @returns Result<void> — never throws
   */
  async sendMagicLink(email: string): Promise<Result<void>> {
    try {
      const secret = this.getMagicLinkSecret();
      const token = generateMagicLinkToken(email, secret);

      await this.prisma.user.upsert({
        where: { email },
        update: { magicLinkToken: token, magicLinkExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
        create: {
          email,
          magicLinkToken: token,
          magicLinkExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
      const magicUrl = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;

      const { error } = await this.resend.emails.send({
        from: 'ConversionOps <noreply@conversionops.io>',
        to: email,
        subject: 'Your sign-in link',
        html: `
          <p>Click the link below to sign in. It expires in 15 minutes.</p>
          <p><a href="${magicUrl}">Sign in to ConversionOps</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      if (error) {
        logger.error({ email, error }, 'Failed to send magic link email');
        return { ok: false, error: new Error(error.message) };
      }

      logger.info({ email }, 'Magic link sent');
      return { ok: true, value: undefined };
    } catch (error) {
      logger.error({ email, err: error }, 'sendMagicLink error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Verifies a magic-link token, creates a JWT session, and invalidates the token.
   * @param token - Token from the magic link URL query param
   * @returns Result<{ jwt, user }> — never throws
   */
  async verifyMagicLink(token: string): Promise<Result<VerifyResult>> {
    try {
      const secret = this.getMagicLinkSecret();
      const verifyResult = verifyMagicLinkToken(token, secret);
      if (!verifyResult.ok) {
        return { ok: false, error: verifyResult.error };
      }

      const { email } = verifyResult.value;

      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, magicLinkToken: true, magicLinkExpiresAt: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        return { ok: false, error: new Error('User not found') };
      }

      if (user.magicLinkToken !== token) {
        return { ok: false, error: new Error('Token already used or invalid') };
      }

      if (!user.magicLinkExpiresAt || user.magicLinkExpiresAt < new Date()) {
        return { ok: false, error: new Error('Token expired') };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          magicLinkToken: null,
          magicLinkExpiresAt: null,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      const jwtSecret = this.getJwtSecret();
      const jwtToken = signToken({ sub: user.id, email: user.email }, jwtSecret, '7d');

      logger.info({ userId: user.id, email: user.email }, 'User authenticated via magic link');

      return {
        ok: true,
        value: {
          jwt: jwtToken,
          user: { id: user.id, email: user.email, name: user.name },
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'verifyMagicLink error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private getMagicLinkSecret(): string {
    const secret = process.env['MAGIC_LINK_SECRET'];
    if (!secret) throw new Error('MAGIC_LINK_SECRET env var not set');
    return secret;
  }

  private getJwtSecret(): string {
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET env var not set');
    return secret;
  }
}
