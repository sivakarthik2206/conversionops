import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { RoutingService } from './routing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard, RequirePermission } from '../../common/guards/rbac.guard';
import { CurrentWorkspace, AuthenticatedWorkspace } from '../../common/decorators/workspace.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantLeakageError } from '@conversionops/sdk-standards';

const RoutingStrategyEnum = z.enum([
  'ROUND_ROBIN',
  'PERFORMANCE_BASED',
  'GEOGRAPHY',
  'LANGUAGE',
  'AVAILABILITY',
  'CUSTOM',
]);

const CreateRoutingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  strategy: RoutingStrategyEnum.optional(),
  priority: z.number().int().min(0).optional(),
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  expression: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(),
});

const UpdateRoutingRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  strategy: RoutingStrategyEnum.optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  expression: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(),
});

type CreateRoutingRuleDto = z.infer<typeof CreateRoutingRuleSchema>;
type UpdateRoutingRuleDto = z.infer<typeof UpdateRoutingRuleSchema>;

@Controller('routing-rules')
@UseGuards(AuthGuard, RbacGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Get()
  @RequirePermission('routing:read')
  async listRules(@CurrentWorkspace() workspace: AuthenticatedWorkspace) {
    const result = await this.routingService.listRules(workspace.id);
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Post()
  @RequirePermission('routing:write')
  async createRule(
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(CreateRoutingRuleSchema)) dto: CreateRoutingRuleDto,
  ) {
    const result = await this.routingService.createRule(workspace.id, dto);
    if (!result.ok) throw new UnprocessableEntityException(result.error.message);
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('routing:write')
  async updateRule(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
    @Body(new ZodValidationPipe(UpdateRoutingRuleSchema)) dto: UpdateRoutingRuleDto,
  ) {
    try {
      const result = await this.routingService.updateRule(id, workspace.id, dto);
      if (!result.ok) throw new NotFoundException('Routing rule not found');
      return result.value;
    } catch (err) {
      if (err instanceof TenantLeakageError) throw new NotFoundException('Routing rule not found');
      throw err;
    }
  }

  @Delete(':id')
  @RequirePermission('routing:write')
  async deleteRule(
    @Param('id') id: string,
    @CurrentWorkspace() workspace: AuthenticatedWorkspace,
  ) {
    try {
      const result = await this.routingService.deleteRule(id, workspace.id);
      if (!result.ok) throw new NotFoundException('Routing rule not found');
      return result.value;
    } catch (err) {
      if (err instanceof TenantLeakageError) throw new NotFoundException('Routing rule not found');
      throw err;
    }
  }
}
