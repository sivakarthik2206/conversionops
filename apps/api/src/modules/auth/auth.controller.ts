import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';

const MagicLinkSchema = z.object({
  email: z.string().email(),
});

const VerifySchema = z.object({
  token: z.string().min(1),
  workspaceSlug: z.string().optional(),
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
    const result = await this.authService.sendMagicLink(body.email);
    if (!result.ok) throw new BadRequestException('Failed to send magic link');
    return { message: 'Magic link sent if account exists' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(
    @Body(new ZodValidationPipe(VerifySchema)) body: z.infer<typeof VerifySchema>,
  ) {
    const result = await this.authService.verifyMagicLink(body.token, body.workspaceSlug);
    if (!result.ok) throw new UnauthorizedException('Invalid or expired login link');
    return {
      token: result.value.jwt,
      user: result.value.user,
    };
  }
}
