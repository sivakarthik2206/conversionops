import {
  Body, Controller, Get, NotFoundException, Param, Patch,
  Query, UnprocessableEntityException, UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AppointmentService } from './appointment.service';
import { UpdateAppointmentCommand } from './commands/update-appointment.command';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, type AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantLeakageError } from '@conversionops/sdk-standards';
import type { AppointmentStatus } from '@conversionops/db';

const UpdateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['PENDING_CONFIRMATION','CONFIRMED','RESCHEDULED','CANCELLED','COMPLETED','NO_SHOW']).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;

@Controller('appointments')
@UseGuards(AuthGuard, RbacGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @RequirePermission('lead:read')
  async listAppointments(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Query('status') status?: string,
    @Query('workspaceUserId') workspaceUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const result = await this.appointmentService.listAppointments(workspace.id, {
      status: status as AppointmentStatus | undefined,
      workspaceUserId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cursor,
      limit: limitStr ? Math.min(parseInt(limitStr, 10), 100) : 25,
    });
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Get(':id')
  @RequirePermission('lead:read')
  async getAppointment(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    const result = await this.appointmentService.getAppointment(id, workspace.id);
    if (!result.ok) throw new NotFoundException('Appointment not found');
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('lead:write')
  async updateAppointment(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(UpdateAppointmentSchema)) dto: UpdateAppointmentDto,
  ) {
    try {
      const result = await this.appointmentService.updateAppointment(
        new UpdateAppointmentCommand(
          id, workspace.id,
          dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          dto.status as AppointmentStatus | undefined,
          dto.location,
          dto.notes,
          dto.cancellationReason,
        ),
      );
      if (!result.ok) throw new NotFoundException('Appointment not found');
      return result.value;
    } catch (err) {
      if (err instanceof TenantLeakageError) throw new NotFoundException('Appointment not found');
      throw err;
    }
  }
}
