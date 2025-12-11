import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ParcelSize, PaymentType } from '../entities/parcel.entity';

export class CreateParcelDto {
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @IsNumber()
  @IsNotEmpty()
  pickupLatitude: number;

  @IsNumber()
  @IsNotEmpty()
  pickupLongitude: number;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsNumber()
  @IsNotEmpty()
  deliveryLatitude: number;

  @IsNumber()
  @IsNotEmpty()
  deliveryLongitude: number;

  @IsEnum(ParcelSize)
  size: ParcelSize;

  @IsOptional()
  @IsString()
  type?: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  codAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  shippingCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

