import { IsMongoId } from 'class-validator';

export class CreateOrderDto {
  @IsMongoId()
  truck!: string;

  @IsMongoId()
  pickup!: string;

  @IsMongoId()
  dropoff!: string;
}
