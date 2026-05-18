import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const MagicLinkSchema = z.object({
  email: z.string().email(),
});

const VerifySchema = z.object({
  token: z.string().min(1),
});

type MagicLinkDto = z.infer<typeof MagicLinkSchema>;
type VerifyDto = z.infer<typeof VerifySchema>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('magic-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendMagicLink(
    @Body(new ZodValidationPipe(MagicLinkSchema)) dto: MagicLinkDto,
  ): Promise<void> {
    const result = await this.authService.sendMagicLink(dto.email);
    if (!result.ok) {
      // Swallow error — never reveal whether an email exists
    }
  }

  @Post('verify')
  async verify(
    @Body(new ZodValidationPipe(VerifySchema)) dto: VerifyDto,
  ): Promise<{ jwt: string; user: { id: string; email: string; name: string | null } }> {
    const result = await this.authService.verifyMagicLink(dto.token);
    if (!result.ok) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return result.value;
  }
}
