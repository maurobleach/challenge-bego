import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { TrucksService } from './trucks.service';

@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createTruckDto: CreateTruckDto, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.trucksService.create(createTruckDto, user.sub);
  }

  @Get()
  findAll() {
    return this.trucksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTruckDto: UpdateTruckDto,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.trucksService.update(id, updateTruckDto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.trucksService.remove(id, user.sub);
  }
}
