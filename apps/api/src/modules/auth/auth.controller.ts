import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/user.decorator';
import { AuthService } from './auth.service';
import { logger } from '@conversionops/observability';

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const SetPasswordSchema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') });
const ForgotPasswordSchema = z.object({ email: z.string().email() });
const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(
    @Body(new ZodValidationPipe(LoginSchema)) body: z.infer<typeof LoginSchema>,
  ) {
    const result = await this.authService.loginWithPassword(body.email, body.password);
    if (!result.ok) {
      logger.warn({ email: body.email }, 'Login failed');
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      jwt: result.value.jwt,
      user: {
        id: result.value.user.id,
        email: result.value.user.email,
        name: result.value.user.name,
      },
      workspace: result.value.workspace,
    };
  }

  @Post('set-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SetPasswordSchema)) body: z.infer<typeof SetPasswordSchema>,
  ) {
    const result = await this.authService.setPassword(user.id, body.password);
    if (!result.ok) throw new BadRequestException(result.error.message);
    return { success: true };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) body: z.infer<typeof ForgotPasswordSchema>,
  ) {
    await this.authService.initiatePasswordReset(body.email);
    return { message: "If that email exists, a reset link is on its way" };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: z.infer<typeof ResetPasswordSchema>,
  ) {
    const result = await this.authService.resetPassword(body.token, body.password);
    if (!result.ok) throw new BadRequestException('This link has expired or is invalid. Please request a new one.');
    return { success: true };
  }
}
