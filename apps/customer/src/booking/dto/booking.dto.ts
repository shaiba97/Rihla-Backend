import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  MinLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BookingStatus, PaymentStatus } from '@app/prisma';

export class PassengerItemDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsNumber()
  @Min(1)
  @Max(120)
  age: number;

  @IsString()
  @IsEnum(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsNumber({}, { each: true })
  @Type(() => Number)
  @Min(1, { each: true })
  seatNumbers: number[];

  @IsString()
  @IsNotEmpty()
  passengerContact: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerItemDto)
  passenger: PassengerItemDto[];

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tripId?: string;

  @IsOptional()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  seatNumbers?: number[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  passengerContact?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerItemDto)
  passenger?: PassengerItemDto[];

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  companyAmount: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  commissionAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  receiptFile?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  platformFeeAmount?: number;
}

export class CreateBookingWithPaymentDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? (() => { try { const p = JSON.parse(value); return Array.isArray(p) ? p.map(Number) : []; } catch { return []; } })()
      : value,
  )
  seatNumbers: number[];

  @IsString()
  @IsNotEmpty()
  passengerContact: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerItemDto)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? (() => { try { return JSON.parse(value); } catch { return []; } })()
      : value,
  )
  passenger: PassengerItemDto[];

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  companyAmount: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  commissionAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  platformFeeAmount?: number;

  @IsOptional()
  @IsString()
  receiptFile?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bookingId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  companyAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  commissionAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  receiptFile?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  platformFeeAmount?: number;
}
