import { IsOptional, IsString } from 'class-validator';

export class UpdateTruckDto {
  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  plates?: string;
}
