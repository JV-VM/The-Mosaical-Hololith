import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OffsetPaginationQueryDto } from '../shared/dto/offset-pagination-query.dto';
import { CurrentMembership } from '../tenants/decorators/current-membership.decorator';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import type { TenantMembership } from '../tenants/tenant-request';
import { TenantAdminGuard } from '../tenants/guards/tenant-admin.guard';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';

@Controller()
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly tags: TagsService) {}

  // -----------------------
  // Public
  // -----------------------

  @Get('tags')
  listPublic(@Query() query: OffsetPaginationQueryDto) {
    return this.tags.publicListTags({
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('tags/:slug')
  landing(@Param('slug') slug: string) {
    return this.tags.publicTagLanding(slug);
  }

  // -----------------------
  // MVP Admin/Seed (lock later)
  // -----------------------
  @UseGuards(JwtAuthGuard, TenantMemberGuard, TenantAdminGuard)
  @Post('admin/tags')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentMembership() membership: TenantMembership,
    @Body() dto: CreateTagDto,
  ) {
    this.logger.log(
      `admin tag create tenantId=${tenantId} membershipId=${membership.id}`,
    );

    return this.tags.createTag({
      name: dto.name,
      slug: dto.slug,
      tier: dto.tier,
      flags: dto.flags,
    });
  }

  // -----------------------
  // Tenant scoped assignments
  // -----------------------

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('stores/:storeId/tags')
  assignStoreTag(
    @CurrentTenant() tenantId: string,
    @Param('storeId') storeId: string,
    @Body() dto: AssignTagDto,
  ) {
    return this.tags.assignTagToStore({ tenantId, storeId, tagId: dto.tagId });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Delete('stores/:storeId/tags/:tagId')
  unassignStoreTag(
    @CurrentTenant() tenantId: string,
    @Param('storeId') storeId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tags.unassignTagFromStore({ tenantId, storeId, tagId });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('products/:productId/tags')
  assignProductTag(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: AssignTagDto,
  ) {
    return this.tags.assignTagToProduct({
      tenantId,
      productId,
      tagId: dto.tagId,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Delete('products/:productId/tags/:tagId')
  unassignProductTag(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tags.unassignTagFromProduct({ tenantId, productId, tagId });
  }
}
