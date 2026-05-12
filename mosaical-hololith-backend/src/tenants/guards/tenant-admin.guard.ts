import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import type { TenantRequest } from '../tenant-request';

@Injectable()
export class TenantAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();

    if (!request.user?.id) {
      throw new UnauthorizedException();
    }

    if (!request.membership) {
      throw new ForbiddenException('Missing tenant membership context');
    }

    if (request.membership.role !== MemberRole.TENANT_ADMIN) {
      throw new ForbiddenException('Tenant admin access required');
    }

    return true;
  }
}
