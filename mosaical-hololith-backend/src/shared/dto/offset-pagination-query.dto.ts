import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_OFFSET_PAGINATION_LIMIT = 20;
export const MAX_OFFSET_PAGINATION_LIMIT = 50;

export class OffsetPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_OFFSET_PAGINATION_LIMIT)
  limit: number = DEFAULT_OFFSET_PAGINATION_LIMIT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
