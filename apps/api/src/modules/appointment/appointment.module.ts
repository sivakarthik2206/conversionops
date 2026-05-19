import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentHandler } from './commands/create-appointment.handler';
import { UpdateAppointmentHandler } from './commands/update-appointment.handler';
import { ListAppointmentsHandler } from './queries/list-appointments.handler';
import { GetAppointmentHandler } from './queries/get-appointment.handler';

@Module({
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    CreateAppointmentHandler,
    UpdateAppointmentHandler,
    ListAppointmentsHandler,
    GetAppointmentHandler,
  ],
  exports: [AppointmentService, CreateAppointmentHandler],
})
export class AppointmentModule {}
