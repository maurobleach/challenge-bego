import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const password = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userModel.create({ email, password });
    return this.toPublicUser(user);
  }

  async login(loginUserDto: LoginUserDto) {
    const email = loginUserDto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email }).select('+password').exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
    };
  }

  async create(createUserDto: CreateUserDto) {
    return this.register(createUserDto);
  }

  async findAll() {
    const users = await this.userModel.find().exec();
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const dataToUpdate: Partial<{ email: string; password: string }> = {};

    if (updateUserDto.email) {
      dataToUpdate.email = updateUserDto.email.trim().toLowerCase();
      const existingUser = await this.userModel
        .findOne({ email: dataToUpdate.email })
        .exec();

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, dataToUpdate, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { id, deleted: true };
  }

  private toPublicUser(user: UserDocument) {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
