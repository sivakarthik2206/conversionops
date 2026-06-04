import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { IntegrationsService } from './integrations.service';

const TwilioConnectSchema = z.object({
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  phoneNumber: z.string().min(1),
});

const FUBConnectSchema = z.object({
  apiKey: z.string().min(1),
});

const CalComConnectSchema = z.object({
  apiKey: z.string().min(1),
  username: z.string().min(1),
});

const ZapierConnectSchema = z.object({
  webhookUrl: z.string().url(),
});

function getConnectSchema(provider: string) {
  switch (provider) {
    case 'twilio':        return TwilioConnectSchema;
    case 'follow_up_boss': return FUBConnectSchema;
    case 'calcom':        return CalComConnectSchema;
    case 'zapier':        return ZapierConnectSchema;
    default:              return z.object({});
  }
}

const API_BASE = 'https://api.conversionops.in/v1';
const APP_BASE = 'https://app.conversionops.in';

@Controller('integrations')
@UseGuards(AuthGuard, RbacGuard)
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  async listIntegrations(@CurrentWorkspace() ws: AuthenticatedWorkspace) {
    return { integrations: await this.service.list(ws.id) };
  }

  @Get('twilio/webhook-urls')
  getTwilioWebhookUrls() {
    return {
      smsWebhookUrl:    `${API_BASE}/webhooks/twilio/sms`,
      voiceWebhookUrl:  `${API_BASE}/webhooks/twilio/voice`,
      statusCallbackUrl: `${API_BASE}/webhooks/twilio/status`,
    };
  }

  @Get('website-snippet')
  getWebsiteSnippet(@CurrentWorkspace() ws: AuthenticatedWorkspace) {
    const snippet = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='${APP_BASE}/widget.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','_co','${ws.id}');</script>`;
    return { snippet, workspaceId: ws.id };
  }

  @Post(':provider/connect')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('settings:write')
  async connect(
    @Param('provider') provider: string,
    @CurrentWorkspace() ws: AuthenticatedWorkspace,
    @Body() rawBody: unknown,
  ) {
    const MARK_ONLY = ['zillow', 'realtor_com', 'website'];
    if (MARK_ONLY.includes(provider)) {
      await this.service.markConnected(ws.id, provider);
      return { success: true };
    }

    const schema = getConnectSchema(provider);
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join(', '));
    }

    const result = await this.service.connect(ws.id, provider, parsed.data as Record<string, string>);
    if (!result.ok) {
      throw new BadRequestException({
        error: 'CONNECTION_FAILED',
        message: `Could not connect. ${result.error?.message ?? 'Check your credentials and try again.'}`,
      });
    }
    return { success: true, integration: { provider, status: 'connected', config: result.value } };
  }

  @Post(':provider/disconnect')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('settings:write')
  async disconnect(@Param('provider') provider: string, @CurrentWorkspace() ws: AuthenticatedWorkspace) {
    await this.service.disconnect(ws.id, provider);
    return { success: true };
  }

  @Post(':provider/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('settings:write')
  async testIntegration(@Param('provider') provider: string, @CurrentWorkspace() ws: AuthenticatedWorkspace) {
    const result = await this.service.test(ws.id, provider);
    if (!result.ok) {
      return { success: false, message: result.error?.message ?? 'Test failed', latencyMs: 0 };
    }
    return { success: true, message: result.value.message, latencyMs: result.value.latencyMs };
  }
}
