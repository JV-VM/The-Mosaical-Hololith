import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { TenantMembership, TenantRequest } from '../tenant-request';

export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantMembership => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!request.membership) {
      throw new ForbiddenException('Missing tenant membership context');
    }

    return request.membership;
  },
);
