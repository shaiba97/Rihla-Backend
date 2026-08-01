import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchCitiesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
