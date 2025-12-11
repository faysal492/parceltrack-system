import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { ParcelStatus } from '../entities/parcel.entity';

export class UpdateParcelStatusDto {
  @IsEnum(ParcelStatus)
  status: ParcelStatus;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;
}

