import {
  IsString,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({ description: 'معرف الحافلة' })
  @IsString({ message: 'معرف الحافلة مطلوب' })
  @IsNotEmpty({ message: 'معرف الحافلة لا يمكن أن يكون فارغاً' })
  busId: string;

  @ApiProperty({ description: 'تاريخ المغادرة' })
  @IsDateString({}, { message: 'تاريخ المغادرة يجب أن يكون تاريخاً صالحاً' })
  @IsNotEmpty({ message: 'تاريخ المغادرة مطلوب' })
  departureDate: Date;

  @ApiProperty({ description: 'وقت المغادرة' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'وقت المغادرة يجب أن يكون بصيغة HH:mm أو HH:mm:ss' })
  @IsNotEmpty({ message: 'وقت المغادرة مطلوب' })
  departureTime: string;

  @ApiProperty({ description: 'الولاية departure' })
  @IsString({ message: 'ولاية departure يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'ولاية departure مطلوبة' })
  fromState: string;

  @ApiProperty({ description: 'المدينة departure' })
  @IsString({ message: 'المدينة departure يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'المدينة departure مطلوبة' })
  fromCity: string;

  @ApiProperty({ description: 'محطة departure' })
  @IsString({ message: 'محطة departure يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'محطة departure مطلوبة' })
  fromStation: string;

  @ApiProperty({ description: 'وقت الوصول' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'وقت الوصول يجب أن يكون بصيغة HH:mm أو HH:mm:ss' })
  @IsNotEmpty({ message: 'وقت وصول مطلوب' })
  arrivalTime: string;

  @ApiProperty({ description: 'تاريخ وصول' })
  @IsDateString({}, { message: 'تاريخ وصول يجب أن يكون تاريخاً صالحاً' })
  @IsNotEmpty({ message: 'تاريخ وصول مطلوب' })
  arrivalDate: Date;

  @ApiProperty({ description: 'الولاية arrival' })
  @IsString({ message: 'الولاية arrival يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'الولاية arrival مطلوبة' })
  toState: string;

  @ApiProperty({ description: 'المدينة arrival' })
  @IsString({ message: 'المدينة arrival يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'المدينة arrival مطلوبة' })
  toCity: string;

  @ApiProperty({ description: 'محطة arrival' })
  @IsString({ message: 'محطة arrival يجب أن تكون نصاً' })
  @IsNotEmpty({ message: 'محطة arrival مطلوبة' })
  toStation: string;

  @ApiProperty({ description: 'السعر' })
  @IsNumber({}, { message: 'السعر يجب أن يكون عدداً' })
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'الحالة' })
  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    message: 'الحالة يجب أن تكون نصاً',
  })
  status?: string;
}

export class UpdateTripDto {
  @ApiProperty({ description: 'معرف الحافلة' })
  @IsString({ message: 'معرف الحافلة يجب أن يكون نصاً' })
  @IsOptional()
  busId?: string;

  @ApiProperty({ description: 'وقت الحضور' })
  @IsString({ message: 'وقت الحضور يجب أن يكون نصاً' })
  @IsOptional()
  presenceTime?: string;

  @ApiProperty({ description: 'تاريخ المغادرة' })
  @IsDateString({}, { message: 'تاريخ المغادرة يجب أن يكون تاريخاً صالحاً' })
  @IsOptional()
  departureDate?: string;

  @ApiProperty({ description: 'وقت المغادرة' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'وقت المغادرة يجب أن يكون بصيغة HH:mm أو HH:mm:ss' })
  @IsOptional()
  departureTime?: string;

  @ApiProperty({ description: 'الولاية departure' })
  @IsString({ message: 'ولاية departure يجب أن تكون نصاً' })
  @IsOptional()
  fromState?: string;

  @ApiProperty({ description: 'المدينة departure' })
  @IsString({ message: 'المدينة departure يجب أن تكون نصاً' })
  @IsOptional()
  fromCity?: string;

  @ApiProperty({ description: 'محطة departure' })
  @IsString({ message: 'محطة departure يجب أن تكون نصاً' })
  @IsOptional()
  fromStation?: string;

  @ApiProperty({ description: 'وقت وصول' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'وقت الوصول يجب أن يكون بصيغة HH:mm أو HH:mm:ss' })
  @IsOptional()
  arrivalTime?: string;

  @ApiProperty({ description: 'تاريخ وصول' })
  @IsDateString({}, { message: 'تاريخ وصول يجب أن يكون تاريخاً صالحاً' })
  @IsOptional()
  arrivalDate?: string;

  @ApiProperty({ description: 'الولاية arrival' })
  @IsString({ message: 'الولاية arrival يجب أن تكون نصاً' })
  @IsOptional()
  toState?: string;

  @ApiProperty({ description: 'المدينة arrival' })
  @IsString({ message: 'المدينة arrival يجب أن تكون نصاً' })
  @IsOptional()
  toCity?: string;

  @ApiProperty({ description: 'محطة arrival' })
  @IsString({ message: 'محطة arrival يجب أن تكون نصاً' })
  @IsOptional()
  toStation?: string;

  @ApiProperty({ description: 'الحالة' })
  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    message: 'الحالة يجب أن تكون نصاً',
  })
  status?: string;
}

export class TripQueryDto {
  @ApiProperty({ description: 'معرف الحافلة' })
  @IsString({ message: 'معرف الحافلة يجب أن يكون نصاً' })
  @IsOptional()
  busId?: string;

  @ApiProperty({ description: 'الولاية departure' })
  @IsString({ message: 'ولاية departure يجب أن تكون نصاً' })
  @IsOptional()
  fromState?: string;

  @ApiProperty({ description: 'المدينة departure' })
  @IsString({ message: 'المدينة departure يجب أن تكون نصاً' })
  @IsOptional()
  fromCity?: string;

  @ApiProperty({ description: 'محطة departure' })
  @IsString({ message: 'محطة departure يجب أن تكون نصاً' })
  @IsOptional()
  fromStation?: string;

  @ApiProperty({ description: 'الولاية arrival' })
  @IsString({ message: 'الولاية arrival يجب أن تكون نصاً' })
  @IsOptional()
  toState?: string;

  @ApiProperty({ description: 'المدينة arrival' })
  @IsString({ message: 'المدينة arrival يجب أن تكون نصاً' })
  @IsOptional()
  toCity?: string;

  @ApiProperty({ description: 'محطة arrival' })
  @IsString({ message: 'محطة arrival يجب أن تكون نصاً' })
  @IsOptional()
  toStation?: string;

  @ApiProperty({ description: 'تاريخ المغادرة' })
  @IsDateString({}, { message: 'تاريخ المغادرة يجب أن يكون تاريخاً صالحاً' })
  @IsOptional()
  departureDate?: string;

  @ApiProperty({ description: 'الحالة' })
  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    message: 'الحالة يجب أن تكون نصاً',
  })
  status?: string;
}
