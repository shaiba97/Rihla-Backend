import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway } from '@app/websocket';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: TafiyaWsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async getDashboardStats(companyId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { Bus: { companyId } },
      include: {
        Booking: {
          where: { status: 'CONFIRMED' },
          include: { Payment: true },
        },
        PayoutRecordItem: true,
        PayoutRequest: { where: { status: 'PENDING' } },
      },
    });

    let totalUnpaidAmount = 0;
    let totalPaidAmount = 0;

    for (const trip of trips) {
      const paidOut = trip.PayoutRecordItem.length > 0;
      const totalRevenue = trip.Booking.reduce(
        (sum: number, b: any) => sum + Number(b.Payment?.companyAmount ?? 0),
        0,
      );

      if (paidOut) {
        totalPaidAmount += totalRevenue;
      } else {
        totalUnpaidAmount += totalRevenue;
      }
    }

    const pendingRequestCount = await this.prisma.payoutRequest.count({
      where: { companyId, status: 'PENDING' },
    });

    return {
      totalUnpaidAmount: Math.round(totalUnpaidAmount),
      totalPaidAmount: Math.round(totalPaidAmount),
      pendingRequestCount,
    };
  }

  private static readonly PAYOUT_MIN_DELAY_MS = 30 * 60 * 1000;

  private getDepartureInstant(
    departureDate: Date,
    departureTime: string,
  ): Date {
    const dep = new Date(departureDate);
    const [hh, mm] = (departureTime ?? '00:00').split(':').map(Number);
    dep.setHours(hh || 0, mm || 0, 0, 0);
    return dep;
  }

  private isEligible(departureDate: Date, departureTime: string): boolean {
    const departure = this.getDepartureInstant(
      departureDate,
      departureTime,
    ).getTime();
    return Date.now() - departure >= PayoutService.PAYOUT_MIN_DELAY_MS;
  }

  async getTrips(companyId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { Bus: { companyId } },
      include: {
        Booking: {
          where: { status: 'CONFIRMED' },
          include: { Payment: true },
        },
        PayoutRecordItem: {
          include: {
            PayoutRecord: {
              select: {
                receiptFile: true,
                receiptData: true,
                receiptMime: true,
              },
            },
          },
        },
        PayoutRequest: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
        },
      },
      orderBy: { departureDate: 'desc' },
    });

    return trips.map((trip) => {
      const totalRevenue = trip.Booking.reduce(
        (sum: number, b: any) => sum + Number(b.Payment?.companyAmount ?? 0),
        0,
      );
      const paidOut = trip.PayoutRecordItem.length > 0;
      const hasPendingRequest = trip.PayoutRequest.length > 0;

      let receiptFile: string | null = null;
      let receiptData: string | null = null;
      let receiptMime: string | null = null;

      if (paidOut && trip.PayoutRecordItem[0]?.PayoutRecord) {
        const rec = trip.PayoutRecordItem[0].PayoutRecord;
        receiptFile = rec.receiptFile ?? null;
        receiptData = rec.receiptData ?? null;
        receiptMime = rec.receiptMime ?? null;
      }

      return {
        id: trip.id,
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        departureDate: trip.departureDate,
        departureTime: trip.departureTime,
        route: `${trip.fromCity} → ${trip.toCity}`,
        unpaidAmount: paidOut ? 0 : Math.round(totalRevenue),
        paidOut,
        hasPendingRequest,
        canRequest:
          !paidOut &&
          !hasPendingRequest &&
          totalRevenue > 0 &&
          this.isEligible(trip.departureDate, trip.departureTime),
        receiptFile,
        receiptData,
        receiptMime,
      };
    });
  }

  async requestPayout(companyId: string, tripId?: string) {
    // Trip eligibility reads, pending-checks and inserts run inside one
    // transaction serialized by a per-company advisory lock, so two
    // concurrent requests can never create duplicate payout requests for
    // the same trip (double-payout race).
    const requests = await this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}))::text`;

      const trips = await tx.trip.findMany({
        where: {
          Bus: { companyId },
          ...(tripId ? { id: tripId } : {}),
        },
        include: {
          Booking: {
            where: { status: 'CONFIRMED' },
            include: { Payment: true },
          },
          PayoutRecordItem: true,
          PayoutRequest: {
            where: { status: { in: ['PENDING', 'APPROVED'] } },
          },
        },
      });

      if (trips.length === 0) {
        throw new NotFoundException('لا توجد رحلات متاحة للصرف');
      }

      const pendingTrips: (typeof trips)[number][] = [];
      const blockedTrips: { id: string; fromCity: string; toCity: string }[] =
        [];

      for (const trip of trips) {
        if (trip.PayoutRecordItem.length > 0) continue;
        if (trip.PayoutRequest.length > 0) continue;

        const totalRevenue = trip.Booking.reduce(
          (sum: number, b: any) => sum + Number(b.Payment?.companyAmount ?? 0),
          0,
        );

        if (totalRevenue <= 0) continue;

        pendingTrips.push(trip);
        if (!this.isEligible(trip.departureDate, trip.departureTime)) {
          blockedTrips.push({
            id: trip.id,
            fromCity: trip.fromCity,
            toCity: trip.toCity,
          });
        }
      }

      if (pendingTrips.length === 0) {
        throw new BadRequestException('لا توجد مبالغ جديدة للصرف');
      }

      if (blockedTrips.length > 0) {
        const names = blockedTrips
          .map((t) => `${t.fromCity} ← ${t.toCity}`)
          .join('، ');
        throw new BadRequestException(
          `لا يمكن طلب صرف هذه الرحلات قبل مرور ٣٠ دقيقة على موعد الانطلاق: ${names}`,
        );
      }

      const created = [];

      for (const trip of pendingTrips) {
        const totalRevenue = trip.Booking.reduce(
          (sum: number, b: any) => sum + Number(b.Payment?.companyAmount ?? 0),
          0,
        );

        const request = await tx.payoutRequest.create({
          data: {
            companyId,
            tripId: trip.id,
            amount: totalRevenue,
            status: 'PENDING',
          },
        });

        created.push(request);
      }

      return created;
    });

    // Notify all admin users about the payout request (non-blocking).
    try {
      const admins = await this.prisma.users.findMany({
        where: { role: 'ADMIN' as any, isActive: true },
        select: { id: true },
      });
      const totalAmount = requests.reduce((s, r) => s + Number(r.amount), 0);

      for (const admin of admins) {
        await this.notifications.create({
          userId: admin.id,
          type: 'PAYOUT_REQUEST',
          title: 'طلب صرف جديد',
          body: `تم تقديم طلب صرف جديد بمبلغ ${totalAmount} جنيه`,
          data: {
            requestIds: requests.map((r) => r.id),
            totalAmount,
          },
          emitTo: `admin`,
        });
      }
    } catch (e) {
      this.logger.warn(
        'Failed to notify admins (non-blocking): ' + (e as Error).message,
      );
    }

    return {
      message: `تم إرسال طلب صرف بنجاح`,
      data: requests,
    };
  }

  async getRequests(companyId: string) {
    return this.prisma.payoutRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHistory(companyId: string) {
    const records = await this.prisma.payoutRecord.findMany({
      where: { companyId },
      include: {
        Items: {
          include: {
            Trip: { select: { id: true, fromCity: true, toCity: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      amount: Math.round(Number(r.amount)),
      note: r.note,
      receiptFile: r.receiptFile,
      receiptData: r.receiptData,
      receiptMime: r.receiptMime,
      createdAt: r.createdAt,
      items: r.Items.map((item) => ({
        trip: {
          id: item.Trip.id,
          fromCity: item.Trip.fromCity,
          toCity: item.Trip.toCity,
        },
      })),
    }));
  }

  async getAccount(companyId: string) {
    const account = await this.prisma.companyBankAccount.findUnique({
      where: { companyId },
    });

    if (!account) {
      return { accountHolderName: null, bankName: null, accountNumber: null };
    }

    return {
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
    };
  }

  async updateAccount(
    companyId: string,
    data: {
      accountHolderName?: string;
      bankName?: string;
      accountNumber?: string;
    },
  ) {
    const account = await this.prisma.companyBankAccount.upsert({
      where: { companyId },
      create: {
        companyId,
        accountHolderName: data.accountHolderName ?? null,
        bankName: data.bankName ?? null,
        accountNumber: data.accountNumber ?? null,
      },
      update: {
        ...(data.accountHolderName !== undefined
          ? { accountHolderName: data.accountHolderName }
          : {}),
        ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
        ...(data.accountNumber !== undefined
          ? { accountNumber: data.accountNumber }
          : {}),
      },
    });

    return {
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
    };
  }
}
