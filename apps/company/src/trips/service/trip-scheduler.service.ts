import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/prisma';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';

@Injectable()
export class TripSchedulerService {
  private readonly logger = new Logger(TripSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: RihlaWsGateway,
  ) {}

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private toTimeStr(d: Date): string {
    return d.toTimeString().slice(0, 5);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTripStatusUpdates() {
    const now = new Date();
    const todayStr = this.toDateStr(now);
    const currentTime = this.toTimeStr(now);

    try {
      const scheduledTrips = await this.prisma.trip.findMany({
        where: {
          status: 'SCHEDULED',
          departureDate: { lte: now },
        },
        select: { id: true, departureDate: true, departureTime: true },
      });

      const toInProgress = scheduledTrips.filter((t) => {
        const depDate = this.toDateStr(new Date(t.departureDate));
        const depTime = t.departureTime?.slice(0, 5) ?? '00:00';
        return (
          depDate < todayStr || (depDate === todayStr && depTime <= currentTime)
        );
      });

      if (toInProgress.length > 0) {
        await this.prisma.trip.updateMany({
          where: { id: { in: toInProgress.map((t) => t.id) } },
          data: { status: 'IN_PROGRESS' },
        });
        this.logger.log(`Updated ${toInProgress.length} trips to IN_PROGRESS`);
        toInProgress.forEach((t) => {
          this.wsGateway.emitPublic(WS_EVENTS.TRIP_STATUS_CHANGED, { tripId: t.id, status: 'IN_PROGRESS' });
        });
      }

      const inProgressTrips = await this.prisma.trip.findMany({
        where: {
          status: 'IN_PROGRESS',
          arrivalDate: { lte: now },
        },
        select: { id: true, arrivalDate: true, arrivalTime: true },
      });

      const toCompleted = inProgressTrips.filter((t) => {
        const arrDate = this.toDateStr(new Date(t.arrivalDate));
        const arrTime = t.arrivalTime?.slice(0, 5) ?? '00:00';
        return (
          arrDate < todayStr || (arrDate === todayStr && arrTime <= currentTime)
        );
      });

      if (toCompleted.length > 0) {
        await this.prisma.trip.updateMany({
          where: { id: { in: toCompleted.map((t) => t.id) } },
          data: { status: 'COMPLETED' },
        });
        this.logger.log(`Updated ${toCompleted.length} trips to COMPLETED`);
        toCompleted.forEach((t) => {
          this.wsGateway.emitPublic(WS_EVENTS.TRIP_STATUS_CHANGED, { tripId: t.id, status: 'COMPLETED' });
        });
      }
    } catch (error) {
      this.logger.error('Failed to update trip statuses', error);
    }
  }
}
