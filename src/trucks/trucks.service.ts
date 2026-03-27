import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { Truck, TruckDocument } from './schemas/truck.schema';

@Injectable()
export class TrucksService {
  constructor(
    @InjectModel(Truck.name) private readonly truckModel: Model<TruckDocument>,
  ) {}

  async create(createTruckDto: CreateTruckDto, userId: string) {
    const plates = createTruckDto.plates.trim().toUpperCase();
    const existingTruck = await this.truckModel.findOne({ plates }).exec();
    if (existingTruck) {
      throw new ConflictException('Plates already in use');
    }

    const truck = await this.truckModel.create({
      user: new Types.ObjectId(userId),
      year: createTruckDto.year.trim(),
      color: createTruckDto.color.trim(),
      plates,
    });

    return this.toPublicTruck(truck);
  }

  async findAll() {
    const trucks = await this.truckModel.find().populate('user', 'email').exec();
    return trucks.map((truck) => this.toPublicTruck(truck));
  }

  async findOne(id: string) {
    const truck = await this.truckModel
      .findById(id)
      .populate('user', 'email')
      .exec();

    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return this.toPublicTruck(truck);
  }

  async update(id: string, updateTruckDto: UpdateTruckDto, userId: string) {
    await this.assertOwnership(id, userId);

    const dataToUpdate: Partial<{
      year: string;
      color: string;
      plates: string;
    }> = {};

    if (updateTruckDto.year) {
      dataToUpdate.year = updateTruckDto.year.trim();
    }

    if (updateTruckDto.color) {
      dataToUpdate.color = updateTruckDto.color.trim();
    }

    if (updateTruckDto.plates) {
      const plates = updateTruckDto.plates.trim().toUpperCase();
      const existingTruck = await this.truckModel.findOne({ plates }).exec();
      if (existingTruck && existingTruck.id !== id) {
        throw new ConflictException('Plates already in use');
      }
      dataToUpdate.plates = plates;
    }

    const truck = await this.truckModel
      .findByIdAndUpdate(id, dataToUpdate, {
        new: true,
        runValidators: true,
      })
      .populate('user', 'email')
      .exec();

    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return this.toPublicTruck(truck);
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    const truck = await this.truckModel.findByIdAndDelete(id).exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return { id, deleted: true };
  }

  private async assertOwnership(id: string, userId: string) {
    const truck = await this.truckModel.findById(id).select('user').exec();
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    if (truck.user.toString() !== userId) {
      throw new ForbiddenException('You are not the owner of this truck');
    }
  }

  private toPublicTruck(truck: TruckDocument) {
    return {
      id: truck.id,
      user: truck.user,
      year: truck.year,
      color: truck.color,
      plates: truck.plates,
      createdAt: truck.createdAt,
      updatedAt: truck.updatedAt,
    };
  }
}
