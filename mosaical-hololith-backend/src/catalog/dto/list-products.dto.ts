import { OffsetPaginationQueryDto } from '../../shared/dto/offset-pagination-query.dto';
import { IsOptional, IsString } from 'class-validator';

export class ListProductsDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  storeId?: string;
}
