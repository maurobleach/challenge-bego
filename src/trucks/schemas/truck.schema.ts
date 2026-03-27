import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class Truck {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  year!: string;

  @Prop({ required: true, trim: true })
  color!: string;

  @Prop({ required: true, trim: true, unique: true })
  plates!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type TruckDocument = HydratedDocument<Truck>;
export const TruckSchema = SchemaFactory.createForClass(Truck);
