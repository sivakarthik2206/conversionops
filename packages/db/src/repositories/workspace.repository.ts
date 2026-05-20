import { PrismaClient, Workspace, Prisma } from '@prisma/client';

export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Finds a workspace by primary key. */
  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  /** Finds a workspace by unique slug. */
  async findBySlug(slug: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { slug } });
  }

  /** Creates a new workspace. */
  async create(data: Prisma.WorkspaceCreateInput): Promise<Workspace> {
    return this.prisma.workspace.create({ data });
  }

  /** Updates workspace fields. */
  async update(id: string, data: Prisma.WorkspaceUpdateInput): Promise<Workspace> {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  /** Finds workspace by Stripe customer ID. */
  async findByStripeCustomerId(stripeCustomerId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({ where: { stripeCustomerId } });
  }

  /** Finds workspace by Stripe subscription ID. */
  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({ where: { stripeSubscriptionId } });
  }
}
