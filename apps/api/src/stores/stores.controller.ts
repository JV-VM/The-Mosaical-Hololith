import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OffsetPaginationQueryDto } from '../shared/dto/offset-pagination-query.dto';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

@Controller()
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  // Dashboard (tenant scoped)
  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('stores')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateStoreDto) {
    return this.stores.createStore({
      tenantId,
      name: dto.name,
      slug: dto.slug,
      subdomain: dto.subdomain,
      customDomain: dto.customDomain,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('stores')
  listMine(
    @CurrentTenant() tenantId: string,
    @Query() query: OffsetPaginationQueryDto,
  ) {
    return this.stores.listStoresByTenant({
      tenantId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Patch('stores/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.stores.updateStore({
      tenantId,
      storeId: id,
      patch: {
        name: dto.name,
        slug: dto.slug,
        subdomain: dto.subdomain,
        customDomain: dto.customDomain ?? undefined,
      },
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('stores/:id/publish')
  publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.stores.publishStore(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('stores/:id/unpublish')
  unpublish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.stores.unpublishStore(tenantId, id);
  }

  // Public
  @Get('stores/:slug')
  publicBySlug(@Param('slug') slug: string) {
    return this.stores.publicGetStoreBySlug(slug);
  }
}
