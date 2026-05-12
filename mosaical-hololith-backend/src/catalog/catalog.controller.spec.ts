import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import type { CreateProductDto } from './dto/create-product.dto';

describe('CatalogController', () => {
  let controller: CatalogController;
  let catalog: { createProduct: jest.Mock };

  beforeEach(async () => {
    catalog = {
      createProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: catalog,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: TenantMemberGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: PrismaService,
          useValue: {
            membership: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  it('create forwards tenantId and media to the service', async () => {
    const dto: CreateProductDto = {
      storeId: 'store-1',
      title: 'Product',
      slug: 'product',
      description: 'Desc',
      priceCents: 1234,
      currency: 'USD',
      media: { images: ['https://cdn.example.com/a.png'] },
    };
    catalog.createProduct.mockResolvedValue({ id: 'product-1' });

    await controller.create('tenant-1', dto);

    expect(catalog.createProduct).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      storeId: 'store-1',
      title: 'Product',
      slug: 'product',
      description: 'Desc',
      priceCents: 1234,
      currency: 'USD',
      media: dto.media,
    });
  });
});
