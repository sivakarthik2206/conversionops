import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@conversionops/observability';
import { Result } from '@conversionops/types';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { Message } from '@conversionops/db';
import { SendMessageCommand } from './send-message.command';
import { HumanOverrideService } from '../human-override.service';

@Injectable()
export class SendMessageHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly humanOverride: HumanOverrideService,
  ) {}

  /**
   * Sends a HUMAN-role message on a conversation.
   * Checks isAIAllowed before sending — human messages always go through.
   * @returns Result<Message> — never throws
   */
  async execute(cmd: SendMessageCommand): Promise<Result<Message>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: cmd.conversationId, workspaceId: cmd.workspaceId, deletedAt: null },
        select: { id: true, workspaceId: true, leadId: true },
      });
      if (!conversation) {
        return { ok: false, error: new TenantLeakageError(cmd.conversationId, cmd.workspaceId) };
      }

      const message = await this.prisma.message.create({
        data: {
          conversationId: cmd.conversationId,
          workspaceId: cmd.workspaceId,
          role: 'HUMAN',
          content: cmd.content,
        },
      });

      await this.prisma.conversation.update({
        where: { id: cmd.conversationId },
        data: { updatedAt: new Date() },
      });

      return { ok: true, value: message };
    } catch (error) {
      logger.error({ err: error }, 'SendMessageHandler error');
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
