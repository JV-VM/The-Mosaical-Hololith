import { MemberRole } from '@prisma/client';
import type { Request } from 'express';

export type TenantMembership = {
  id: string;
  role: MemberRole;
};

export type TenantRequest = Request & {
  tenantId?: string;
  membership?: TenantMembership;
  user?: { id: string; email?: string };
};
