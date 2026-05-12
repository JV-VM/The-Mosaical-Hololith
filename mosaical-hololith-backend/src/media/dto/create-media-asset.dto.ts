import {
  IsBase64,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { env } from '../../shared/env';

export class CreateMediaAssetDto {
  @IsString()
  storeId!: string;

  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsBase64()
  contentBase64!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(env.MEDIA_MAX_UPLOAD_BYTES)
  sizeBytes?: number;
}
