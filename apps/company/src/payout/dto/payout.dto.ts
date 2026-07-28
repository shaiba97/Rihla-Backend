import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PayoutRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class RequestPayoutDto {
  @ApiProperty({ description: 'معرف الرحلة (اختياري، إذا كان فارغاً سيتم طلب صرف الكل)' })
  @IsString()
  @IsOptional()
  tripId?: string;
}

export class UpdateAccountDto {
  @ApiProperty({ description: 'اسم صاحب الحساب' })
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @ApiProperty({ description: 'اسم البنك أو المحفظة' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ description: 'رقم الحساب' })
  @IsString()
  @IsOptional()
  accountNumber?: string;
}
