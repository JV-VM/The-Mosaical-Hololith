import { ProductStatus, StoreStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../shared/prisma/prisma.service';
import { DiscoveryService } from './discovery.service';

function createPrismaMock() {
  return {
    store: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

function getFirstCallArg(mockFn: jest.Mock): Record<string, unknown> {
  const firstCallUnknown: unknown = mockFn.mock.calls[0];
  expect(Array.isArray(firstCallUnknown)).toBe(true);
  if (!Array.isArray(firstCallUnknown)) {
    throw new Error('Expected mock to be called');
  }

  const argUnknown: unknown = (firstCallUnknown as unknown[])[0];
  if (!argUnknown || typeof argUnknown !== 'object') {
    throw new Error('Expected mock call args to be an object');
  }

  return argUnknown as Record<string, unknown>;
}

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    prismaMock.store.findMany.mockReset();
    prismaMock.product.findMany.mockReset();
    prismaMock.store.count.mockReset();
    prismaMock.product.count.mockReset();
    prismaMock.store.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.store.count.mockResolvedValue(0);
    prismaMock.product.count.mockResolvedValue(0);
  });

  describe('explore', () => {
    it('queries only stores when type=store', async () => {
      await service.explore({ type: 'store', limit: 10, offset: 0 });

      expect(prismaMock.store.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
      expect(prismaMock.store.count).toHaveBeenCalledTimes(1);
    });

    it('queries only products when type=product', async () => {
      await service.explore({ type: 'product', limit: 10, offset: 0 });

      expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.store.findMany).not.toHaveBeenCalled();
      expect(prismaMock.product.count).toHaveBeenCalledTimes(1);
    });

    it('queries both stores and products when type=all', async () => {
      await service.explore({ type: 'all', limit: 5, offset: 0, tags: [] });

      expect(prismaMock.store.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.store.count).toHaveBeenCalledTimes(1);
      expect(prismaMock.product.count).toHaveBeenCalledTimes(1);
    });

    it('always enforces published-only filters in queries', async () => {
      await service.explore({ type: 'all', limit: 5, offset: 0 });

      const storeArgs = getFirstCallArg(prismaMock.store.findMany);
      const productArgs = getFirstCallArg(prismaMock.product.findMany);

      const storeWhere = storeArgs.where as Record<string, unknown> | undefined;
      const productWhere = productArgs.where as
        | Record<string, unknown>
        | undefined;

      expect(storeWhere?.status).toBe(StoreStatus.PUBLISHED);
      expect(productWhere?.status).toBe(ProductStatus.PUBLISHED);

      const productStore = productWhere?.store as
        | Record<string, unknown>
        | undefined;
      expect(productStore?.status).toBe(StoreStatus.PUBLISHED);
    });

    it('returns discovery results in the shared data/meta envelope', async () => {
      const result = await service.explore({
        type: 'all',
        limit: 5,
        offset: 0,
      });

      expect(result).toEqual({
        data: {
          stores: [],
          products: [],
        },
        meta: {
          query: {
            q: undefined,
            tags: [],
            type: 'all',
            sort: 'new',
            limit: 5,
            offset: 0,
          },
          pagination: {
            limit: 5,
            offset: 0,
            count: { stores: 0, products: 0 },
            total: { stores: 0, products: 0 },
            hasMore: { stores: false, products: false },
          },
        },
      });
    });
  });
});
