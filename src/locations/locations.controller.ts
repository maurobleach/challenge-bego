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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(@Body() createLocationDto: CreateLocationDto, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.locationsService.create(createLocationDto, user.sub);
  }

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.locationsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.locationsService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Req() req: Request,
  ) {
    const user = req.user as JwtUser;
    return this.locationsService.update(id, updateLocationDto, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtUser;
    return this.locationsService.remove(id, user.sub);
  }
}
