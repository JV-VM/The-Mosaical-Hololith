import { IsOptional, IsString } from 'class-validator';
import { OffsetPaginationQueryDto } from '../../shared/dto/offset-pagination-query.dto';

export class ListMediaAssetsDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  storeId?: string;
}
