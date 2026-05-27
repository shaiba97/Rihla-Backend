import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/prisma';
import { RihlaWsGateway, WS_EVENTS } from '@app/websocket';

@Injectable()
export class TripSchedulerService {
  private lastDbFailure: number = 0;

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

    if (this.lastDbFailure > 0 && Date.now() - this.lastDbFailure < 60000) {
      return;
    }

    try {
      const scheduledTrips = await this.prisma.trip.findMany({
        where: {
          status: 'SCHEDULED',
          departureDate: { lte: now },
        },
        select: { id: true, departureDate: true, departureTime: true },
      });

      const toInProgress = scheduledTrips.filter((t: any) => {
        const depDate = this.toDateStr(new Date(t.departureDate));
        const depTime = t.departureTime?.slice(0, 5) ?? '00:00';
        return (
          depDate < todayStr || (depDate === todayStr && depTime <= currentTime)
        );
      });

      if (toInProgress.length > 0) {
        await this.prisma.trip.updateMany({
          where: { id: { in: toInProgress.map((t: any) => t.id) } },
          data: { status: 'IN_PROGRESS' },
        });
        toInProgress.forEach((t: any) => {
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

      const toCompleted = inProgressTrips.filter((t: any) => {
        const arrDate = this.toDateStr(new Date(t.arrivalDate));
        const arrTime = t.arrivalTime?.slice(0, 5) ?? '00:00';
        return (
          arrDate < todayStr || (arrDate === todayStr && arrTime <= currentTime)
        );
      });

      if (toCompleted.length > 0) {
        await this.prisma.trip.updateMany({
          where: { id: { in: toCompleted.map((t: any) => t.id) } },
          data: { status: 'COMPLETED' },
        });
        toCompleted.forEach((t: any) => {
          this.wsGateway.emitPublic(WS_EVENTS.TRIP_STATUS_CHANGED, { tripId: t.id, status: 'COMPLETED' });
        });
      }
    } catch {
      this.lastDbFailure = Date.now();
    }
  }
}
