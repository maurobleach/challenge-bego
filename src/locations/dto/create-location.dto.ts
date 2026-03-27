import { IsString } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  place_id!: string;
}
