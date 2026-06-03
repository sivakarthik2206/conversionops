import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { logger } from '@conversionops/observability';

const MagicLinkSchema = z.object({
  email: z.string().email(),
});

const VerifySchema = z.object({
  token: z.string().min(10),
});

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async sendMagicLink(
    @Body(new ZodValidationPipe(MagicLinkSchema)) body: z.infer<typeof MagicLinkSchema>,
  ) {
    // Fire-and-forget — never reveal whether an account exists
    await this.authService.sendMagicLink(body.email);
    return { success: true, message: 'If an account exists, a magic link has been sent' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(
    @Body(new ZodValidationPipe(VerifySchema)) body: z.infer<typeof VerifySchema>,
  ) {
    const result = await this.authService.verifyMagicLink(body.token);
    if (!result.ok) {
      logger.warn({ reason: result.error.message }, 'Magic link verify rejected');
      throw new UnauthorizedException(result.error.message);
    }
    logger.info({ userId: result.value.user.id }, 'Magic link verify success');
    return {
      jwt: result.value.jwt,
      user: {
        id: result.value.user.id,
        email: result.value.user.email,
        name: result.value.user.name,
      },
    };
  }
}
