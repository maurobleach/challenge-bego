import { IsString } from 'class-validator';

export class CreateTruckDto {
  @IsString()
  year!: string;

  @IsString()
  color!: string;

  @IsString()
  plates!: string;
}
