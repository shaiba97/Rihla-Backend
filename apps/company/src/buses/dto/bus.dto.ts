import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SeatStartFrom {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export class PlateDto {
  @ApiProperty({ description: 'رقم اللوحة بالعربية' })
  @IsString({ message: 'رقم اللوحة بالعربية مطلوب' })
  @IsNotEmpty({ message: 'رقم اللوحة بالعربية لا يمكن أن يكون فارغاً' })
  @Matches(/^[\u0600-\u06FF\s\d]+$/, {
    message: 'يجب أن يحتوي رقم اللوحة بالعربية على أحرف عربية وأرقام فقط',
  })
  arabic: string;

  @ApiProperty({ description: 'رقم اللوحة بالإنجليزية' })
  @IsString({ message: 'رقم اللوحة بالإنجليزية مطلوب' })
  @IsNotEmpty({ message: 'رقم اللوحة بالإنجليزية لا يمكن أن يكون فارغاً' })
  @Matches(/^[A-Za-z\s\d]+$/, {
    message: 'يجب أن يحتوي رقم اللوحة بالإنجليزية على أحرف إنجليزية وأرقام فقط',
  })
  english: string;

  @ApiProperty({ description: 'أرقام اللوحة' })
  @IsNotEmpty({ message: 'أرقام اللوحة لا يمكن أن تكون فارغة' })
  @Matches(/^\d+$/, { message: 'يجب أن تحتوي أرقام اللوحة على أرقام فقط' })
  numbers: string;

  [key: string]: any;
}

export class CreateBusDto {
  @ApiProperty({ description: 'اسم الحافلة' })
  @IsString({ message: 'اسم الحافلة مطلوب' })
  @IsNotEmpty({ message: 'اسم الحافلة لا يمكن أن يكون فارغاً' })
  @Matches(/^[\u0600-\u06FF\sA-Za-z\d]+$/, {
    message: 'يجب أن يحتوي اسم الحافلة على أحرف عربية أو إنجليزية وأرقام فقط',
  })
  name: string;

  @ApiProperty({ description: 'عدد المقاعد' })
  @IsInt({ message: 'عدد المقاعد يجب أن يكون رقماً' })
  @Min(1, { message: 'يجب أن تحتوي الحافلة على مقعد واحد على الأقل' })
  @Max(100, { message: 'لا يمكن أن تزيد المقاعد عن 100 مقعد' })
  chairs: number;

  @ApiProperty({ description: 'بداية المقاعد' })
  @IsEnum(SeatStartFrom, {
    message: 'يجب أن يكون بداية المقاعد إما LEFT أو RIGHT',
  })
  seatStartFrom: SeatStartFrom;

  @ApiProperty({ description: 'بيانات اللوحة' })
  @IsObject({ message: 'بيانات اللوحة مطلوبة' })
  @ValidateNested({ message: 'بيانات اللوحة غير صالحة' })
  @Type(() => PlateDto)
  plate: PlateDto;
}

export class UpdateBusDto {
  @ApiProperty({ description: 'معرف الشركة' })
  @IsString({ message: 'معرف الشركة يجب أن يكون نصاً' })
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'اسم الحافلة' })
  @IsString({ message: 'اسم الحافلة يجب أن يكون نصاً' })
  @Matches(/^[\u0600-\u06FF\sA-Za-z\d]*$/, {
    message: 'يجب أن يحتوي اسم الحافلة على أحرف عربية أو إنجليزية وأرقام فقط',
  })
  @IsOptional({ message: 'اسم الحافلة اختياري' })
  name?: string;

  @ApiProperty({ description: 'عدد المقاعد' })
  @IsInt({ message: 'عدد المقاعد يجب أن يكون رقماً' })
  @Min(1, { message: 'يجب أن تحتوي الحافلة على مقعد واحد على الأقل' })
  @IsOptional()
  chairs?: number;

  @ApiProperty({ description: 'بداية المقاعد' })
  @IsEnum(SeatStartFrom, {
    message: 'يجب أن يكون بداية المقاعد إما LEFT أو RIGHT',
  })
  @IsOptional()
  seatStartFrom?: SeatStartFrom;

  @ApiProperty({ description: 'بيانات اللوحة' })
  @ValidateNested({ message: 'بيانات اللوحة غير صالحة' })
  @Type(() => PlateDto)
  @IsOptional()
  plate?: PlateDto;
}

export class BusQueryDto {
  @ApiProperty({ description: 'اسم الحافلة' })
  @IsString({ message: 'اسم الحافلة يجب أن يكون نصاً' })
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'الحد الأدنى للمقاعد' })
  @IsInt({ message: 'الحد الأدنى للمقاعد يجب أن يكون رقماً' })
  @Min(1, { message: 'الحد الأدنى للمقاعد يجب أن يكون 1 على الأقل' })
  @IsOptional()
  minChairs?: number;

  @ApiProperty({ description: 'الحد الأقصى للمقاعد' })
  @IsInt({ message: 'الحد الأقصى للمقاعد يجب أن يكون رقماً' })
  @IsOptional()
  maxChairs?: number;

  @ApiProperty({ description: 'بداية المقاعد' })
  @IsEnum(SeatStartFrom, {
    message: 'يجب أن يكون بداية المقاعد من اليسار أو اليمين',
  })
  @IsOptional()
  seatStartFrom?: SeatStartFrom;

  @ApiProperty({ description: 'رقم اللوحة بالعربية' })
  @IsString({ message: 'رقم اللوحة بالعربية يجب أن يكون نصاً' })
  @Matches(/^[\u0600-\u06FF\s\d]*$/, {
    message: 'يجب أن يحتوي رقم اللوحة بالعربية على أحرف عربية وأرقام فقط',
  })
  @IsOptional()
  plateArabic?: string;

  @ApiProperty({ description: 'رقم اللوحة بالإنجليزية' })
  @Matches(/^[A-Za-z\s\d]*$/, {
    message: 'يجب أن يحتوي رقم اللوحة بالإنجليزية على أحرف إنجليزية وأرقام فقط',
  })
  @IsOptional()
  plateEnglish?: string;
}
