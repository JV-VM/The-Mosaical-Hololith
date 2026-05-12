import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OffsetPaginationQueryDto } from '../shared/dto/offset-pagination-query.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTenantDto) {
    return this.tenants.createTenant({ name: dto.name, ownerId: user.id });
  }

  @Get('me')
  listMine(
    @CurrentUser() user: { id: string },
    @Query() query: OffsetPaginationQueryDto,
  ) {
    return this.tenants.listMyTenants({
      userId: user.id,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
