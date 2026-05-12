import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { ListMediaAssetsDto } from './dto/list-media-assets.dto';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Post('media/assets')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMediaAssetDto,
  ) {
    return this.media.createAsset({
      tenantId,
      userId: user.id,
      storeId: dto.storeId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      contentBase64: dto.contentBase64,
      sizeBytes: dto.sizeBytes,
    });
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('media/assets')
  list(@CurrentTenant() tenantId: string, @Query() query: ListMediaAssetsDto) {
    return this.media.listAssets({
      tenantId,
      storeId: query.storeId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('media/assets/:id/content')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async content(
    @Param('id') assetId: string,
    @Res({ passthrough: true }) reply: ReplyWithHeader,
  ) {
    const file = await this.media.getPublicContent(assetId);
    reply.header('Content-Type', file.mimeType);
    reply.header(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );
    return file.body;
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Delete('media/assets/:id')
  delete(@CurrentTenant() tenantId: string, @Param('id') assetId: string) {
    return this.media.deleteAsset({ tenantId, assetId });
  }
}

type ReplyWithHeader = {
  header: (name: string, value: string) => void;
};
