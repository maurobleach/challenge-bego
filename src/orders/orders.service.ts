import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Location, LocationDocument } from '../locations/schemas/location.schema';
import { Truck, TruckDocument } from '../trucks/schemas/truck.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Truck.name) private readonly truckModel: Model<TruckDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    if (createOrderDto.pickup === createOrderDto.dropoff) {
      throw new BadRequestException('pickup and dropoff must be different');
    }

    const userObjectId = new Types.ObjectId(userId);

    const [truck, pickup, dropoff] = await Promise.all([
      this.truckModel.findOne({ _id: createOrderDto.truck, user: userObjectId }).exec(),
      this.locationModel
        .findOne({ _id: createOrderDto.pickup, user: userObjectId })
        .exec(),
      this.locationModel
        .findOne({ _id: createOrderDto.dropoff, user: userObjectId })
        .exec(),
    ]);

    if (!truck) {
      throw new NotFoundException('Truck not found for this user');
    }

    if (!pickup) {
      throw new NotFoundException('Pickup location not found for this user');
    }

    if (!dropoff) {
      throw new NotFoundException('Dropoff location not found for this user');
    }

    const order = await this.orderModel.create({
      user: userObjectId,
      truck: new Types.ObjectId(createOrderDto.truck),
      pickup: new Types.ObjectId(createOrderDto.pickup),
      dropoff: new Types.ObjectId(createOrderDto.dropoff),
      status: 'created',
    });

    return this.toPublicOrder(order);
  }

  async findAll(userId: string) {
    const orders = await this.orderModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('truck')
      .populate('pickup')
      .populate('dropoff')
      .exec();

    return orders.map((order) => this.toPublicOrder(order));
  }

  async findOne(id: string, userId: string) {
    const order = await this.findOwnedOrder(id, userId);
    return this.toPublicOrder(order);
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
  ) {
    const order = await this.findOwnedOrder(id, userId);

    this.ensureValidStatusTransition(order.status, updateOrderStatusDto.status);

    if (order.status === updateOrderStatusDto.status) {
      return this.toPublicOrder(order);
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(
        order._id,
        { status: updateOrderStatusDto.status },
        { new: true, runValidators: true },
      )
      .populate('truck')
      .populate('pickup')
      .populate('dropoff')
      .exec();

    if (!updated) {
      throw new NotFoundException('Order not found');
    }

    return this.toPublicOrder(updated);
  }

  async remove(id: string, userId: string) {
    const order = await this.findOwnedOrder(id, userId);
    await this.orderModel.findByIdAndDelete(order._id).exec();
    return { id, deleted: true };
  }

  private async findOwnedOrder(id: string, userId: string) {
    const order = await this.orderModel
      .findById(id)
      .populate('truck')
      .populate('pickup')
      .populate('dropoff')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user.toString() !== userId) {
      throw new ForbiddenException('You are not the owner of this order');
    }

    return order;
  }

  private ensureValidStatusTransition(current: OrderStatus, next: OrderStatus) {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      created: ['in transit'],
      'in transit': ['completed'],
      completed: [],
    };

    if (current === next) {
      return;
    }

    const allowed = transitions[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${next}`,
      );
    }
  }

  private toPublicOrder(order: OrderDocument) {
    return {
      id: order.id,
      user: order.user,
      truck: order.truck,
      status: order.status,
      pickup: order.pickup,
      dropoff: order.dropoff,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
