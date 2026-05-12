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
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { ListPagesDto } from './dto/list-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  // -----------------------
  // Dashboard (tenant scoped)
  // -----------------------

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('pages')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePageDto) {
    return this.pages.createPage({
      tenantId,
      storeId: dto.storeId,
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('pages')
  list(@CurrentTenant() tenantId: string, @Query() query: ListPagesDto) {
    return this.pages.listPages({
      tenantId,
      storeId: query.storeId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Patch('pages/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pages.updatePage({
      tenantId,
      pageId: id,
      patch: {
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
      },
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('pages/:id/publish')
  publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.pages.publishPage(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('pages/:id/unpublish')
  unpublish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.pages.unpublishPage(tenantId, id);
  }

  // -----------------------
  // Public
  // -----------------------

  @Get('stores/:storeSlug/pages/:pageSlug')
  publicGet(
    @Param('storeSlug') storeSlug: string,
    @Param('pageSlug') pageSlug: string,
  ) {
    return this.pages.publicGetPageBySlug({ storeSlug, pageSlug });
  }
}
