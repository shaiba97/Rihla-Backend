import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { BusesService } from '../service/buses.service';
import { CreateBusDto, UpdateBusDto } from '../dto/bus.dto';

@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post('post-bus')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() createBusDto: CreateBusDto) {
    return this.busesService.create(createBusDto, req.user.id);
  }

  /** Companies see their own fleet; admins see everything. */
  @Get('get-buses')
  @UseGuards(AuthGuard('jwt'))
  async getBuses(@Req() req: Request) {
    return this.busesService.getBuses(
      (req as any).user.id,
      (req as any).user.role,
    );
  }

  @Get('get-buses/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getBusesByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return this.busesService.getBusesByProperty(
      property,
      value,
      (req as any).user.id,
      (req as any).user.role,
    );
  }

  @Get('get-bus/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  async getBus(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    return this.busesService.getBus(
      property,
      value,
      (req as any).user.id,
      (req as any).user.role,
    );
  }

  @Put('update-bus/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @Req() req: Request,
  ) {
    return this.busesService.update(
      id,
      updateBusDto,
      (req as any).user.id,
      (req as any).user.role,
    );
  }

  @Delete('delete-bus/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.busesService.remove(
      id,
      (req as any).user.id,
      (req as any).user.role,
    );
  }
}
