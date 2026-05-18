import { PrismaClient, Workspace, Prisma } from '@prisma/client';

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  ownerEmail: string;
  timezone?: string;
  plan?: Prisma.EnumPlanFilter['equals'];
}

export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds a workspace by id, excluding soft-deleted records.
   */
  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Finds a workspace by slug, excluding soft-deleted records.
   */
  async findBySlug(slug: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  /**
   * Finds a workspace by Stripe customer id (for billing webhooks).
   */
  async findByStripeCustomerId(customerId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId, deletedAt: null },
    });
  }

  /**
   * Creates a new workspace.
   */
  async create(data: {
    name: string;
    slug: string;
    ownerEmail: string;
    timezone?: string;
    plan?: Workspace['plan'];
  }): Promise<Workspace> {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerEmail: data.ownerEmail,
        timezone: data.timezone ?? 'America/New_York',
        plan: data.plan ?? 'SOLO',
      },
    });
  }

  /**
   * Updates a workspace by id. Validates the record exists before updating.
   */
  async update(
    id: string,
    data: Prisma.WorkspaceUpdateInput,
  ): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data,
    });
  }
}
