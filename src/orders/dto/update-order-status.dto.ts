import { IsIn, IsString } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['created', 'in transit', 'completed'])
  status!: OrderStatus;
}
