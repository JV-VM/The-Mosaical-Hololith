import {
  BadRequestException,
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
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toJsonInputOrThrow } from './json-input';
import { ListProductsDto } from './dto/list-products.dto';
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // -----------------------
  // Dashboard (tenant scoped)
  // -----------------------

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('products')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    if (dto.media !== undefined && dto.mediaAssetIds !== undefined) {
      throw new BadRequestException(
        'Provide either media or mediaAssetIds, not both',
      );
    }

    const media = toJsonInputOrThrow(dto.media);
    return this.catalog.createProduct({
      tenantId,
      storeId: dto.storeId,
      title: dto.title,
      slug: dto.slug,
      description: dto.description,
      priceCents: dto.priceCents,
      currency: dto.currency,
      media,
      mediaAssetIds: dto.mediaAssetIds,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('products')
  list(@CurrentTenant() tenantId: string, @Query() dto: ListProductsDto) {
    return this.catalog.listProducts({
      tenantId,
      storeId: dto.storeId,
      limit: dto.limit,
      offset: dto.offset,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Patch('products/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    if (dto.media !== undefined && dto.mediaAssetIds !== undefined) {
      throw new BadRequestException(
        'Provide either media or mediaAssetIds, not both',
      );
    }

    const media = toJsonInputOrThrow(dto.media);
    return this.catalog.updateProduct({
      tenantId,
      productId: id,
      patch: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency,
        media,
        mediaAssetIds: dto.mediaAssetIds,
      },
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('products/:id/publish')
  publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.catalog.publishProduct(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('products/:id/unpublish')
  unpublish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.catalog.unpublishProduct(tenantId, id);
  }

  // -----------------------
  // Public
  // -----------------------

  @Get('stores/:storeSlug/products')
  publicList(@Param('storeSlug') storeSlug: string) {
    return this.catalog.publicListProductsByStoreSlug(storeSlug);
  }

  @Get('stores/:storeSlug/p/:productSlug')
  publicDetail(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.catalog.publicGetProductByStoreSlug(storeSlug, productSlug);
  }
}
