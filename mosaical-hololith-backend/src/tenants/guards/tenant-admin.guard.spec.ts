import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { TenantAdminGuard } from './tenant-admin.guard';

function createExecutionContext(request: Record<string, unknown>) {
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };

  return context as unknown as ExecutionContext;
}

describe('TenantAdminGuard', () => {
  let guard: TenantAdminGuard;

  beforeEach(() => {
    guard = new TenantAdminGuard();
  });

  it('allows tenant admins', () => {
    const context = createExecutionContext({
      user: { id: 'user-1' },
      membership: { id: 'membership-1', role: MemberRole.TENANT_ADMIN },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects requests without an authenticated user', () => {
    const context = createExecutionContext({
      membership: { id: 'membership-1', role: MemberRole.TENANT_ADMIN },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects non-admin tenant members', () => {
    const context = createExecutionContext({
      user: { id: 'user-1' },
      membership: { id: 'membership-1', role: MemberRole.PRODUCER },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
