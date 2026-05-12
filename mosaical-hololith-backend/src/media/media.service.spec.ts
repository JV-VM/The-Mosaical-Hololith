import { Buffer } from 'node:buffer';
import { BadRequestException } from '@nestjs/common';
import { MediaAssetStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../shared/prisma/prisma.service';
import { MEDIA_STORAGE } from './media.storage';
import { MediaService } from './media.service';

function createPrismaMock() {
  return {
    store: {
      findUnique: jest.fn(),
    },
    mediaAsset: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    productMediaAsset: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
}

function createStorageMock() {
  return {
    writeObject: jest.fn(),
    readObject: jest.fn(),
    deleteObject: jest.fn(),
  };
}

describe('MediaService', () => {
  let service: MediaService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let storageMock: ReturnType<typeof createStorageMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    storageMock = createStorageMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEDIA_STORAGE, useValue: storageMock },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('creates a media asset and returns a public content URL', async () => {
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'store-1',
      tenantId: 'tenant-1',
    });
    prismaMock.mediaAsset.create.mockResolvedValue({
      id: 'asset-1',
      tenantId: 'tenant-1',
      storeId: 'store-1',
      originalFilename: 'hero.png',
      mimeType: 'image/png',
      sizeBytes: 4,
      status: MediaAssetStatus.READY,
      storageDriver: 'local',
      checksumSha256: 'abc',
      createdByUserId: 'user-1',
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      updatedAt: new Date('2026-05-12T00:00:00.000Z'),
    });

    const result = await service.createAsset({
      tenantId: 'tenant-1',
      userId: 'user-1',
      storeId: 'store-1',
      filename: 'hero.png',
      mimeType: 'image/png',
      contentBase64: Buffer.from('test').toString('base64'),
    });

    expect(storageMock.writeObject).toHaveBeenCalledTimes(1);
    expect(prismaMock.mediaAsset.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'asset-1',
      contentUrl: '/api/v1/media/assets/asset-1/content',
    });
  });

  it('rejects unsupported mime types', async () => {
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'store-1',
      tenantId: 'tenant-1',
    });

    await expect(
      service.createAsset({
        tenantId: 'tenant-1',
        userId: 'user-1',
        storeId: 'store-1',
        filename: 'notes.txt',
        mimeType: 'text/plain',
        contentBase64: Buffer.from('hello').toString('base64'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageMock.writeObject).not.toHaveBeenCalled();
  });

  it('builds normalized product media payloads', () => {
    const payload = service.buildProductMediaPayload([
      {
        id: 'asset-1',
        tenantId: 'tenant-1',
        storeId: 'store-1',
        originalFilename: 'hero.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        status: MediaAssetStatus.READY,
        storageDriver: 'local',
        objectKey: 'tenant-1/store-1/hero.png',
        checksumSha256: 'abc',
        createdByUserId: 'user-1',
        createdAt: new Date('2026-05-12T00:00:00.000Z'),
        updatedAt: new Date('2026-05-12T00:00:00.000Z'),
      },
    ]);

    expect(payload).toEqual({
      assets: [
        {
          id: 'asset-1',
          url: '/api/v1/media/assets/asset-1/content',
          filename: 'hero.png',
          mimeType: 'image/png',
          sizeBytes: 10,
        },
      ],
    });
  });
});
