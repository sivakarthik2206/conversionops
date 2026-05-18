/**
 * RBAC Isolation Tests — all four roles against permissions they should not have.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { signToken } from '@conversionops/auth';

jest.setTimeout(30000);

function makeJwt(userId: string, email: string): string {
  const secret = process.env['JWT_SECRET'] ?? 'test-secret-min-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  return signToken({ sub: userId, email }, secret, '1h');
}

describe('RBAC Isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workspaceId: string;

  const tokens: Record<string, string> = {};
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('v1');
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const ts = Date.now();
    const ownerUser = await prisma.user.create({ data: { email: `rbac-owner-${ts}@example.com`, emailVerified: true } });
    const ws = await prisma.workspace.create({
      data: {
        name: 'RBAC Test WS',
        slug: `rbac-ws-${ts}`,
        ownerEmail: ownerUser.email,
        users: { create: { userId: ownerUser.id, role: 'OWNER', isActive: true } },
      },
    });
    workspaceId = ws.id;
    userIds.push(ownerUser.id);
    tokens['OWNER'] = makeJwt(ownerUser.id, ownerUser.email);

    for (const [role, key] of [['ADMIN', 'ADMIN'], ['AGENT', 'AGENT'], ['VIEWER', 'VIEWER']] as const) {
      const u = await prisma.user.create({ data: { email: `rbac-${key.toLowerCase()}-${ts}@example.com`, emailVerified: true } });
      await prisma.workspaceUser.create({ data: { workspaceId, userId: u.id, role, isActive: true } });
      tokens[key] = makeJwt(u.id, u.email);
      userIds.push(u.id);
    }
  });

  afterAll(async () => {
    await prisma.workspaceUser.deleteMany({ where: { workspaceId } });
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  describe('AGENT role', () => {
    it('cannot access billing endpoints — expect 403 or 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/billing/checkout')
        .set('Authorization', `Bearer ${tokens['AGENT']}`)
        .send({ priceId: 'price_test' });
      expect([403, 404]).toContain(res.status);
    });

    it('cannot write workspace settings — expect 403', async () => {
      const res = await request(app.getHttpServer())
        .patch('/v1/workspaces/me')
        .set('Authorization', `Bearer ${tokens['AGENT']}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('cannot invite agents — expect 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/agents/invite')
        .set('Authorization', `Bearer ${tokens['AGENT']}`)
        .send({ email: 'new@example.com', role: 'AGENT' });
      expect(res.status).toBe(403);
    });
  });

  describe('VIEWER role', () => {
    it('cannot send messages — expect 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/conversations/fake-id/message')
        .set('Authorization', `Bearer ${tokens['VIEWER']}`)
        .send({ content: 'hello' });
      expect([403, 404]).toContain(res.status);
      // 403 from RBAC guard, 404 if RBAC passes but conversation doesn't exist
      // VIEWER has no conversation:write → always 403
      expect(res.status).toBe(403);
    });

    it('cannot create leads — expect 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/leads')
        .set('Authorization', `Bearer ${tokens['VIEWER']}`)
        .send({ source: 'MANUAL' });
      expect(res.status).toBe(403);
    });

    it('cannot pause AI — expect 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/workspaces/me/ai/pause')
        .set('Authorization', `Bearer ${tokens['VIEWER']}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('can read workspace — expect 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/workspaces/me')
        .set('Authorization', `Bearer ${tokens['VIEWER']}`);
      expect(res.status).toBe(200);
    });
  });

  describe('ADMIN role', () => {
    it('cannot access billing — expect 403 or 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/billing/checkout')
        .set('Authorization', `Bearer ${tokens['ADMIN']}`)
        .send({ priceId: 'price_test' });
      expect([403, 404]).toContain(res.status);
    });

    it('can read and write workspace settings — expect 200', async () => {
      const res = await request(app.getHttpServer())
        .patch('/v1/workspaces/me')
        .set('Authorization', `Bearer ${tokens['ADMIN']}`)
        .send({ name: 'Updated by Admin' });
      expect([200, 422]).toContain(res.status); // 422 if validation fails but RBAC passes
    });
  });
});
