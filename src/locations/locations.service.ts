import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location, LocationDocument } from './schemas/location.schema';

interface GooglePlaceDetailsNewResponse {
  id?: string;
  name?: string;
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(createLocationDto: CreateLocationDto, userId: string) {
    const placeId = createLocationDto.place_id.trim();

    const existingLocation = await this.locationModel
      .findOne({ user: new Types.ObjectId(userId), place_id: placeId })
      .exec();

    if (existingLocation) {
      throw new ConflictException('Location already exists for this user');
    }

    const details = await this.fetchPlaceDetails(placeId);
    const location = await this.locationModel.create({
      user: new Types.ObjectId(userId),
      place_id: details.place_id,
      address: details.address,
      latitude: details.latitude,
      longitude: details.longitude,
    });

    return this.toPublicLocation(location);
  }

  async findAll(userId: string) {
    const locations = await this.locationModel
      .find({ user: new Types.ObjectId(userId) })
      .exec();

    return locations.map((location) => this.toPublicLocation(location));
  }

  async findOne(id: string, userId: string) {
    const location = await this.findOwnedLocation(id, userId);
    return this.toPublicLocation(location);
  }

  async update(id: string, updateLocationDto: UpdateLocationDto, userId: string) {
    const location = await this.findOwnedLocation(id, userId);

    const dataToUpdate: Partial<{
      place_id: string;
      address: string;
      latitude: number;
      longitude: number;
    }> = {};

    if (updateLocationDto.place_id) {
      const placeId = updateLocationDto.place_id.trim();
      const duplicate = await this.locationModel
        .findOne({
          user: new Types.ObjectId(userId),
          place_id: placeId,
          _id: { $ne: location._id },
        })
        .exec();

      if (duplicate) {
        throw new ConflictException('Location already exists for this user');
      }

      const details = await this.fetchPlaceDetails(placeId);
      dataToUpdate.place_id = details.place_id;
      dataToUpdate.address = details.address;
      dataToUpdate.latitude = details.latitude;
      dataToUpdate.longitude = details.longitude;
    }

    if (updateLocationDto.address) {
      dataToUpdate.address = updateLocationDto.address.trim();
    }

    if (typeof updateLocationDto.latitude === 'number') {
      dataToUpdate.latitude = updateLocationDto.latitude;
    }

    if (typeof updateLocationDto.longitude === 'number') {
      dataToUpdate.longitude = updateLocationDto.longitude;
    }

    const updated = await this.locationModel
      .findByIdAndUpdate(location._id, dataToUpdate, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!updated) {
      throw new NotFoundException('Location not found');
    }

    return this.toPublicLocation(updated);
  }

  async remove(id: string, userId: string) {
    const location = await this.findOwnedLocation(id, userId);
    await this.locationModel.findByIdAndDelete(location._id).exec();
    return { id, deleted: true };
  }

  private async findOwnedLocation(id: string, userId: string) {
    const location = await this.locationModel
      .findById(id)
      .select('+user')
      .exec();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (location.user.toString() !== userId) {
      throw new ForbiddenException('You are not the owner of this location');
    }

    return location;
  }

  private async fetchPlaceDetails(placeId: string) {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GOOGLE_MAPS_API_KEY is required');
    }

    const googlePlacesBaseUrl =
      this.configService.get<string>('GOOGLE_PLACES_BASE_URL') ??
      'https://places.googleapis.com/v1/places';
    const url = `${googlePlacesBaseUrl}/${encodeURIComponent(placeId)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,name,formattedAddress,location',
        },
      });
    } catch {
      throw new BadGatewayException('Could not reach Google Places API');
    }

    const data = (await response.json()) as GooglePlaceDetailsNewResponse;

    if (!response.ok || data.error) {
      if (response.status >= 500) {
        throw new BadGatewayException('Google Places API request failed');
      }
      throw new BadRequestException(
        data.error?.message || 'Invalid place_id or Google API request',
      );
    }

    const latitude = data.location?.latitude;
    const longitude = data.location?.longitude;
    const address = data.formattedAddress;
    const resultPlaceId = data.id || data.name?.replace(/^places\//, '');

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !address ||
      !resultPlaceId
    ) {
      throw new BadRequestException('Incomplete data returned by Google Places API');
    }

    return {
      place_id: resultPlaceId,
      address,
      latitude,
      longitude,
    };
  }

  private toPublicLocation(location: LocationDocument) {
    return {
      id: location.id,
      user: location.user,
      address: location.address,
      place_id: location.place_id,
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
