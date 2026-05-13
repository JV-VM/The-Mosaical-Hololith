import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { buildListResponse } from '../shared/http/api-response';

const TENANT_ADMIN_ROLE = MemberRole.TENANT_ADMIN;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenant(params: { name: string; ownerId: string }) {
    return this.prisma.tenant.create({
      data: {
        name: params.name,
        ownerId: params.ownerId,
        members: {
          create: {
            userId: params.ownerId,
            role: TENANT_ADMIN_ROLE,
          },
        },
      },
      include: { members: true },
    });
  }

  async listMyTenants(params: {
    userId: string;
    limit: number;
    offset: number;
  }) {
    const where = { userId: params.userId };
    const [memberships, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        select: {
          id: true,
          role: true,
          tenant: { select: { id: true, name: true, ownerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.membership.count({ where }),
    ]);

    const items = memberships.map((m) => ({
      tenant: {
        id: m.tenant.id,
        name: m.tenant.name,
        ownerId: m.tenant.ownerId,
      },
      role: m.role,
      membershipId: m.id,
    }));

    return buildListResponse({
      items,
      limit: params.limit,
      offset: params.offset,
      total,
    });
  }
}
