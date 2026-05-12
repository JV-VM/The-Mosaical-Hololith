import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OffsetPaginationQueryDto } from '../shared/dto/offset-pagination-query.dto';

const normalizeQuery = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class ExploreQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeQuery(value))
  q?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeQuery(value))
  tags?: string;

  @IsOptional()
  @IsIn(['store', 'product', 'all'])
  type?: 'store' | 'product' | 'all';

  @IsOptional()
  @IsIn(['new', 'name', 'price'])
  sort?: 'new' | 'name' | 'price';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  declare limit: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare offset: number;
}
