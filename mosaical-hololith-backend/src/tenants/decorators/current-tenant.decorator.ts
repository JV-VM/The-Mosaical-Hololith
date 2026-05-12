import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { TenantRequest } from '../tenant-request';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    return request.tenantId;
  },
);
