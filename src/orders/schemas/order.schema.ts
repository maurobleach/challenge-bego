import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Location } from '../../locations/schemas/location.schema';
import { Truck } from '../../trucks/schemas/truck.schema';
import { User } from '../../users/schemas/user.schema';

export type OrderStatus = 'created' | 'in transit' | 'completed';

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Truck.name, required: true })
  truck!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['created', 'in transit', 'completed'],
    default: 'created',
  })
  status!: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: Location.name, required: true })
  pickup!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Location.name, required: true })
  dropoff!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
