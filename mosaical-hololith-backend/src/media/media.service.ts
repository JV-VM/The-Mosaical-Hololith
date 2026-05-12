import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaAssetStatus, Prisma } from '@prisma/client';
import type { MediaAsset } from '@prisma/client';
import { env } from '../shared/env';
import { buildListResponse } from '../shared/http/api-response';
import { PrismaService as AppPrismaService } from '../shared/prisma/prisma.service';
import { MEDIA_STORAGE, MediaStorage } from './media.storage';

type ProductMediaPayload = {
  assets: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type MediaPrismaClient = AppPrismaService | Prisma.TransactionClient;

const sanitizeFilename = (filename: string): string =>
  filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const decodeBase64OrThrow = (value: string): Buffer => {
  try {
    return Buffer.from(value, 'base64');
  } catch {
    throw new BadRequestException('Invalid media payload');
  }
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: AppPrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
  ) {}

  private getClient(client?: MediaPrismaClient): MediaPrismaClient {
    return client ?? this.prisma;
  }

  private async assertStoreBelongsToTenant(
    storeId: string,
    tenantId: string,
    client?: MediaPrismaClient,
  ) {
    const prisma = this.getClient(client);
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, tenantId: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.tenantId !== tenantId) {
      throw new ForbiddenException('Store does not belong to this tenant');
    }

    return store;
  }

  private buildObjectKey(params: {
    tenantId: string;
    storeId: string;
    filename: string;
  }) {
    const safeFilename = sanitizeFilename(params.filename) || 'asset';
    return pathForAsset(params.tenantId, params.storeId, safeFilename);
  }

  private validateImageUpload(params: {
    mimeType: string;
    sizeBytes: number;
    body: Buffer;
  }) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(params.mimeType)) {
      throw new BadRequestException('Unsupported media type');
    }

    if (params.sizeBytes > env.MEDIA_MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Media file is too large');
    }

    if (params.body.byteLength !== params.sizeBytes) {
      throw new BadRequestException('Media size does not match payload');
    }

    if (params.body.byteLength === 0) {
      throw new BadRequestException('Media payload is empty');
    }
  }

  contentUrl(assetId: string) {
    return `/api/v1/media/assets/${assetId}/content`;
  }

  async createAsset(params: {
    tenantId: string;
    userId: string;
    storeId: string;
    filename: string;
    mimeType: string;
    contentBase64: string;
    sizeBytes?: number;
  }) {
    await this.assertStoreBelongsToTenant(params.storeId, params.tenantId);

    const body = decodeBase64OrThrow(params.contentBase64);
    const sizeBytes = params.sizeBytes ?? body.byteLength;
    this.validateImageUpload({
      mimeType: params.mimeType,
      sizeBytes,
      body,
    });

    const objectKey = this.buildObjectKey({
      tenantId: params.tenantId,
      storeId: params.storeId,
      filename: params.filename,
    });
    const checksumSha256 = createHash('sha256').update(body).digest('hex');

    await this.storage.writeObject({ objectKey, body });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        tenantId: params.tenantId,
        storeId: params.storeId,
        originalFilename: params.filename.trim(),
        mimeType: params.mimeType,
        sizeBytes,
        status: MediaAssetStatus.READY,
        storageDriver: env.MEDIA_STORAGE_DRIVER,
        objectKey,
        checksumSha256,
        createdByUserId: params.userId,
      },
      select: mediaAssetSelect,
    });

    return this.toAssetResponse(asset);
  }

  async listAssets(params: {
    tenantId: string;
    storeId?: string;
    limit: number;
    offset: number;
  }) {
    if (params.storeId) {
      await this.assertStoreBelongsToTenant(params.storeId, params.tenantId);
    }

    const where: Prisma.MediaAssetWhereInput = {
      tenantId: params.tenantId,
      status: MediaAssetStatus.READY,
      ...(params.storeId ? { storeId: params.storeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
        select: mediaAssetSelect,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return buildListResponse({
      items: items.map((asset) => this.toAssetResponse(asset)),
      limit: params.limit,
      offset: params.offset,
      total,
    });
  }

  async getPublicContent(assetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        mimeType: true,
        originalFilename: true,
        objectKey: true,
        status: true,
      },
    });

    if (!asset || asset.status !== MediaAssetStatus.READY) {
      throw new NotFoundException('Media asset not found');
    }

    const object = await this.storage.readObject(asset.objectKey);

    return {
      mimeType: asset.mimeType,
      filename: asset.originalFilename,
      body: object.body,
    };
  }

  async deleteAsset(params: { tenantId: string; assetId: string }) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: params.assetId },
      select: {
        id: true,
        tenantId: true,
        objectKey: true,
        productAssets: { take: 1, select: { productId: true } },
      },
    });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    if (asset.tenantId !== params.tenantId) {
      throw new ForbiddenException(
        'Media asset does not belong to this tenant',
      );
    }

    if (asset.productAssets.length > 0) {
      throw new BadRequestException('Media asset is attached to a product');
    }

    await this.storage.deleteObject(asset.objectKey);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });

    return { ok: true };
  }

  async getReadyOwnedAssetsForStoreOrThrow(params: {
    tenantId: string;
    storeId: string;
    mediaAssetIds: string[];
    client?: MediaPrismaClient;
  }) {
    const uniqueIds = Array.from(new Set(params.mediaAssetIds));
    if (uniqueIds.length === 0) {
      return [];
    }

    await this.assertStoreBelongsToTenant(
      params.storeId,
      params.tenantId,
      params.client,
    );
    const prisma = this.getClient(params.client);
    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: uniqueIds },
        tenantId: params.tenantId,
        storeId: params.storeId,
        status: MediaAssetStatus.READY,
      },
    });

    if (assets.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more media assets are invalid for this store',
      );
    }

    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return uniqueIds.map((id) => {
      const asset = byId.get(id);
      if (!asset) {
        throw new BadRequestException(
          'One or more media assets are invalid for this store',
        );
      }

      return asset;
    });
  }

  buildProductMediaPayload(
    assets: MediaAsset[],
  ): Prisma.InputJsonValue | undefined {
    if (assets.length === 0) {
      return undefined;
    }

    const payload: ProductMediaPayload = {
      assets: assets.map((asset) => ({
        id: asset.id,
        url: this.contentUrl(asset.id),
        filename: asset.originalFilename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      })),
    };

    return payload as Prisma.InputJsonValue;
  }

  async replaceProductMediaAssets(params: {
    productId: string;
    assets: MediaAsset[];
    client: Prisma.TransactionClient;
  }) {
    await params.client.productMediaAsset.deleteMany({
      where: { productId: params.productId },
    });

    if (params.assets.length === 0) {
      return;
    }

    await params.client.productMediaAsset.createMany({
      data: params.assets.map((asset, index) => ({
        productId: params.productId,
        mediaAssetId: asset.id,
        position: index,
      })),
    });
  }

  private toAssetResponse(asset: MediaAssetListRecord) {
    return {
      ...asset,
      contentUrl: this.contentUrl(asset.id),
    };
  }
}

const mediaAssetSelect = {
  id: true,
  tenantId: true,
  storeId: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  storageDriver: true,
  checksumSha256: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type MediaAssetListRecord = Prisma.MediaAssetGetPayload<{
  select: typeof mediaAssetSelect;
}>;

const pathForAsset = (tenantId: string, storeId: string, filename: string) =>
  `${tenantId}/${storeId}/${randomUUID()}-${filename}`;
