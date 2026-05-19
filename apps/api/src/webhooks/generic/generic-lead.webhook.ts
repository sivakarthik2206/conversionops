import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const GenericLeadSchema = z.object({
  source: z.enum([
    'ZILLOW',
    'REALTOR_COM',
    'WEB_FORM',
    'MISSED_CALL',
    'SMS_INBOUND',
    'MANUAL',
    'REACTIVATION',
    'REFERRAL',
    'OTHER',
  ]),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type GenericLeadDto = z.infer<typeof GenericLeadSchema>;

@Controller('webhooks/lead')
@Public()
export class GenericLeadWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Universal lead intake endpoint. Validates workspace via Authorization header.
   * Returns 202 immediately — leadId is assigned async by the lead-intake processor.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleGenericLead(
    @Body(new ZodValidationPipe(GenericLeadSchema)) dto: GenericLeadDto,
    @Headers('authorization') authorization: string,
  ): Promise<{ queued: boolean; leadId: null }> {
    if (!authorization) {
      throw new ForbiddenException('Missing Authorization header');
    }

    const apiKey = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) {
      throw new ForbiddenException('Invalid Authorization header format');
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        featureFlags: { path: ['genericWebhookApiKey'], equals: apiKey },
        deletedAt: null,
      },
    });

    if (!workspace) {
      const sharedSecret = process.env['GENERIC_WEBHOOK_SECRET'];
      if (!sharedSecret || apiKey !== sharedSecret) {
        throw new ForbiddenException('Invalid API key');
      }

      const defaultWorkspace = await this.prisma.workspace.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultWorkspace) {
        throw new UnprocessableEntityException('No workspace configured');
      }

      await queues.leadIntake.add(
        'generic-lead',
        {
          workspaceId: defaultWorkspace.id,
          source: dto.source,
          name: dto.name,
          from: dto.phone,
          email: dto.email,
          externalId: dto.externalId,
          metadata: dto.metadata,
        },
        { removeOnComplete: 500, priority: 3 },
      );

      return { queued: true, leadId: null };
    }

    await queues.leadIntake.add(
      'generic-lead',
      {
        workspaceId: workspace.id,
        source: dto.source,
        name: dto.name,
        from: dto.phone,
        email: dto.email,
        externalId: dto.externalId,
        metadata: dto.metadata,
      },
      { removeOnComplete: 500, priority: 3 },
    );

    logger.info({ workspaceId: workspace.id, source: dto.source }, 'generic-lead: queued');
    return { queued: true, leadId: null };
  }
}
