import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import {
  CreateBusDto,
  UpdateBusDto,
  PlateDto,
  SeatStartFrom,
} from '../dto/bus.dto';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';

/** Properties bus lookups may filter by. */
const BUS_PROPERTIES = ['id', 'companyId'] as const;

function assertAllowedProperty(property: string): void {
  if (!(BUS_PROPERTIES as readonly string[]).includes(property)) {
    throw new ForbiddenException('خاصية البحث غير مسموح بها');
  }
}

@Injectable()
export class BusesService {
  private readonly logger = new Logger(BusesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
  ) {}

  async create(createBusDto: CreateBusDto, userId?: string) {
    if (!userId) {
      return {
        success: false,
        message: 'المستخدم غير مصادق',
      };
    }

    if (!createBusDto || !createBusDto.plate) {
      return {
        success: false,
        message: 'بيانات الحافلة غير صالحة - حقل اللوحة مفقود',
      };
    }

    if (!createBusDto.plate.numbers) {
      return {
        success: false,
        message: 'رقم اللوحة مطلوب',
      };
    }

    const existingBus = await this.prisma.bus.findFirst({
      where: {
        plate: {
          path: ['numbers'],
          equals: createBusDto.plate.numbers,
        },
      },
    });

    this.logger.log(
      'Plate check for: ' +
        createBusDto.plate.numbers +
        ' -> exists: ' +
        (existingBus !== null),
    );

    if (existingBus) {
      return {
        success: false,
        message: 'رقم اللوحة موجود بالفعل',
      };
    }

    try {
      const bus = await this.prisma.bus.create({
        data: {
          companyId: userId,
          name: createBusDto.name,
          chairs: createBusDto.chairs,
          seatStartFrom: createBusDto.seatStartFrom,
          plate: {
            arabic: createBusDto.plate.arabic,
            english: createBusDto.plate.english,
            numbers: createBusDto.plate.numbers,
          },
        },
      });

      this.wsGateway.emitToRoom(
        'company:' + userId,
        WS_EVENTS.BUS_CREATED,
        bus,
      );
      this.wsGateway.emitToAdmin(WS_EVENTS.BUS_CREATED, bus);

      return {
        success: true,
        message: 'تم إنشاء الحافلة بنجاح',
        data: bus,
      };
    } catch (error: any) {
      this.logger.error('Error creating bus:', error.message);
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'رقم اللوحة موجود بالفعل',
        };
      }
      return {
        success: false,
        message: 'فشل في إنشاء الحافلة',
      };
    }
  }

  /** Companies see their own fleet; admins see everything. */
  async getBuses(userId: string, role: string) {
    const where = role === 'ADMIN' ? {} : { companyId: userId };
    return this.prisma.bus.findMany({ where });
  }

  /** Allowlisted property lookup, always scoped to the caller's company. */
  async getBusesByProperty(
    property: string,
    value: string,
    userId: string,
    role: string,
  ) {
    assertAllowedProperty(property);
    const where: any = { [property]: value };
    if (role !== 'ADMIN') where.companyId = userId;
    return this.prisma.bus.findMany({ where });
  }

  async getBus(property: string, value: string, userId: string, role: string) {
    assertAllowedProperty(property);
    const where: any = { [property]: value };
    if (role !== 'ADMIN') where.companyId = userId;
    return this.prisma.bus.findFirst({ where });
  }

  async searchBus() {
    // TODO: Implement search logic
  }

  /** Only the owning company (or an admin) may modify a bus. */
  private assertOwnership(
    bus: { companyId: string },
    userId: string,
    role: string,
  ): void {
    if (role === 'ADMIN') return;
    if (bus.companyId !== userId) {
      throw new ForbiddenException('لا تملك صلاحية على هذه الحافلة');
    }
  }

  async update(
    id: string,
    updateBusDto: UpdateBusDto,
    userId: string,
    role: string,
  ) {
    try {
      const bus = await this.prisma.bus.findUnique({ where: { id } });

      if (!bus) {
        return {
          success: false,
          message: 'الحافلة غير موجودة',
        };
      }

      this.assertOwnership(bus, userId, role);

      if (updateBusDto.plate) {
        const normalizedNumbers = updateBusDto.plate.numbers;
        const existingBus = await this.prisma.bus.findFirst({
          where: {
            id: { not: id },
            plate: {
              path: ['numbers'],
              equals: normalizedNumbers,
            },
          },
        });

        if (existingBus) {
          return {
            success: false,
            message: 'رقم اللوحة موجود بالفعل',
          };
        }
      }

      const updateData: {
        name?: string;
        chairs?: number;
        seatStartFrom?: SeatStartFrom;
        plate?: PlateDto;
      } = {};

      if (updateBusDto.name !== undefined) updateData.name = updateBusDto.name;
      if (updateBusDto.chairs !== undefined)
        updateData.chairs = updateBusDto.chairs;
      if (updateBusDto.seatStartFrom !== undefined)
        updateData.seatStartFrom = updateBusDto.seatStartFrom;
      if (updateBusDto.plate !== undefined)
        updateData.plate = updateBusDto.plate;

      const updatedBus = await this.prisma.bus.update({
        where: { id },
        data: updateData,
      });

      this.wsGateway.emitToRoom(
        'company:' + bus.companyId,
        WS_EVENTS.BUS_UPDATED,
        updatedBus,
      );
      this.wsGateway.emitToAdmin(WS_EVENTS.BUS_UPDATED, updatedBus);

      return {
        success: true,
        message: 'تم تحديث الحافلة بنجاح',
        data: updatedBus,
      };
    } catch (error: any) {
      this.logger.error('Error updating bus:', error.message);
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'رقم اللوحة موجود بالفعل',
        };
      }
      return {
        success: false,
        message: 'فشل في تحديث الحافلة',
      };
    }
  }

  async remove(id: string, userId: string, role: string) {
    const bus = await this.prisma.bus.findUnique({ where: { id } });

    if (!bus) {
      return {
        success: false,
        message: 'الحافلة غير موجودة',
      };
    }

    this.assertOwnership(bus, userId, role);

    await this.prisma.bus.delete({ where: { id } });

    this.wsGateway.emitToRoom(
      'company:' + bus.companyId,
      WS_EVENTS.BUS_DELETED,
      { id },
    );
    this.wsGateway.emitToAdmin(WS_EVENTS.BUS_DELETED, { id });

    return {
      success: true,
      message: 'تم حذف الحافلة بنجاح',
    };
  }
}
