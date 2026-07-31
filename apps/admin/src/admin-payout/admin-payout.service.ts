import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { TafiyaWsGateway, WS_EVENTS } from '@app/websocket';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminPayoutService {
  private readonly logger = new Logger(AdminPayoutService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: TafiyaWsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async getCompanies() {
    const companies = await this.prisma.users.findMany({
      where: { role: 'COMPANY' as any, isActive: true },
      include: {
        CompanyBankAccount: true,
        Bus: {
          include: {
            Trip: {
              include: {
                Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
                PayoutRecordItem: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: companies.map(c => {
        let unpaidAmount = 0;
        for (const bus of c.Bus) {
          for (const trip of bus.Trip) {
            if (trip.PayoutRecordItem.length > 0) continue;
            for (const b of trip.Booking) {
              unpaidAmount += Number(b.Payment?.companyAmount ?? 0);
            }
          }
        }
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          unpaidAmount: Math.round(unpaidAmount),
          accountHolderName: c.CompanyBankAccount?.accountHolderName ?? null,
          bankName: c.CompanyBankAccount?.bankName ?? null,
          accountNumber: c.CompanyBankAccount?.accountNumber ?? null,
        };
      }).filter(c => c.unpaidAmount > 0),
    };
  }

  async getCompanyTrips(companyId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { Bus: { companyId } },
      include: {
        Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
        PayoutRecordItem: true,
      },
      orderBy: { departureDate: 'desc' },
    });

    return {
      data: trips.map(t => {
        let unpaidAmount = 0;
        if (t.PayoutRecordItem.length === 0) {
          for (const b of t.Booking) {
            unpaidAmount += Number(b.Payment?.companyAmount ?? 0);
          }
        }
        return {
          id: t.id,
          fromCity: t.fromCity,
          toCity: t.toCity,
          departureDate: t.departureDate,
          departureTime: t.departureTime,
          unpaidAmount: Math.round(unpaidAmount),
          route: `${t.fromCity} → ${t.toCity}`,
        };
      }).filter(t => t.unpaidAmount > 0),
    };
  }

  async payTrip(tripId: string, receipt?: { receiptFile?: string; receiptData?: string; receiptMime?: string }) {
    const receiptFile = receipt?.receiptFile;
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        Bus: { select: { companyId: true } },
        Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
        PayoutRecordItem: true,
      },
    });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة');
    if (trip.PayoutRecordItem.length > 0) throw new BadRequestException('الرحلة مدفوعة مسبقاً');

    let totalAmount = 0;
    for (const b of trip.Booking) {
      totalAmount += Number(b.Payment?.companyAmount ?? 0);
    }
    if (totalAmount <= 0) throw new BadRequestException('لا توجد مستحقات لهذه الرحلة');

    const companyId = trip.Bus.companyId;

    const result = await this.prisma.$transaction(async (tx: any) => {
      let record = await tx.payoutRecord.findFirst({ where: { companyId } });
      if (!record) {
        record = await tx.payoutRecord.create({
          data: { companyId, amount: totalAmount, ...receipt, note: `صرف رحلة ${trip.fromCity} → ${trip.toCity}` },
        });
      } else {
        await tx.payoutRecord.update({
          where: { id: record.id },
          data: { amount: { increment: totalAmount }, receiptFile: receipt?.receiptFile ?? undefined, receiptData: receipt?.receiptData ?? undefined, receiptMime: receipt?.receiptMime ?? undefined },
        });
      }
      await tx.payoutRecordItem.create({
        data: { payoutRecordId: record.id, tripId },
      });
      return record;
    });

    this.wsGateway.emitToCompany(companyId, WS_EVENTS.NOTIFICATION_NEW, {
      type: 'PAYOUT_REQUEST',
      title: 'تم صرف الرحلة',
      body: `تم صرف مستحقات رحلة ${trip.fromCity} → ${trip.toCity}`,
    });

    await this.notifications.create({
      userId: companyId,
      type: 'PAYOUT_REQUEST',
      title: 'تم صرف الرحلة',
      body: `تم صرف مستحقات رحلة ${trip.fromCity} → ${trip.toCity}`,
      emitTo: `company:${companyId}`,
    });

    return { message: 'تم صرف الرحلة بنجاح', data: result };
  }

  async payAll(companyId: string, receipt?: { receiptFile?: string; receiptData?: string; receiptMime?: string }) {
    const unpaidTrips = await this.prisma.trip.findMany({
      where: { Bus: { companyId } },
      include: {
        Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
        PayoutRecordItem: true,
      },
    });

    const toPay = unpaidTrips.filter(t => t.PayoutRecordItem.length === 0);
    if (toPay.length === 0) throw new BadRequestException('لا توجد رحلات غير مدفوعة');

    let totalAmount = 0;
    for (const trip of toPay) {
      for (const b of trip.Booking) {
        totalAmount += Number(b.Payment?.companyAmount ?? 0);
      }
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      let record = await tx.payoutRecord.findFirst({ where: { companyId } });
      if (!record) {
        record = await tx.payoutRecord.create({
          data: { companyId, amount: totalAmount, ...receipt, note: 'صرف جميع المستحقات' },
        });
      } else {
        await tx.payoutRecord.update({
          where: { id: record.id },
          data: { amount: { increment: totalAmount }, receiptFile: receipt?.receiptFile ?? undefined, receiptData: receipt?.receiptData ?? undefined, receiptMime: receipt?.receiptMime ?? undefined },
        });
      }
      for (const trip of toPay) {
        await tx.payoutRecordItem.create({
          data: { payoutRecordId: record.id, tripId: trip.id },
        });
      }
      return record;
    });

    this.wsGateway.emitToCompany(companyId, WS_EVENTS.NOTIFICATION_NEW, {
      type: 'PAYOUT_REQUEST',
      title: 'تم صرف جميع المستحقات',
      body: `تم صرف جميع مستحقات شركتك بقيمة ${Math.round(totalAmount)} جنيه`,
    });

    await this.notifications.create({
      userId: companyId,
      type: 'PAYOUT_REQUEST',
      title: 'تم صرف جميع المستحقات',
      body: `تم صرف جميع مستحقات شركتك بقيمة ${Math.round(totalAmount)} جنيه`,
      emitTo: `company:${companyId}`,
    });

    return { message: 'تم صرف جميع المستحقات بنجاح', data: result };
  }

  async getRequests() {
    const requests = await this.prisma.payoutRequest.findMany({
      include: {
        Company: { select: { id: true, name: true } },
        Trip: { select: { id: true, fromCity: true, toCity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const accountMap = new Map<string, any>();
    const accounts = await this.prisma.companyBankAccount.findMany();
    for (const acc of accounts) {
      accountMap.set(acc.companyId, acc);
    }

    return {
      data: requests.map(r => {
        const bank = accountMap.get(r.companyId);
        return {
          id: r.id,
          amount: Math.round(Number(r.amount)),
          status: r.status,
          note: r.note,
          createdAt: r.createdAt,
          company: {
            id: r.Company?.id,
            name: r.Company?.name ?? '—',
            accountHolderName: bank?.accountHolderName ?? null,
            bankName: bank?.bankName ?? null,
            accountNumber: bank?.accountNumber ?? null,
          },
          trip: r.Trip ? { fromCity: r.Trip.fromCity, toCity: r.Trip.toCity } : null,
        };
      }),
    };
  }

  async approveRequest(requestId: string, receipt?: { receiptFile?: string; receiptData?: string; receiptMime?: string }) {
    const request = await this.prisma.payoutRequest.findUnique({
      where: { id: requestId },
      include: { Trip: { select: { id: true, fromCity: true, toCity: true } } },
    });
    if (!request) throw new NotFoundException('طلب الصرف غير موجود');
    if (request.status !== 'PENDING') throw new BadRequestException('يمكن قبول الطلبات المعلقة فقط');

    await this.prisma.$transaction(async (tx: any) => {
      await tx.payoutRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', note: receipt?.receiptFile ? `إيصال: ${receipt.receiptFile}` : null },
      });

      let record = await tx.payoutRecord.findFirst({ where: { companyId: request.companyId } });
      if (!record) {
        record = await tx.payoutRecord.create({
          data: {
            companyId: request.companyId,
            amount: request.amount,
            ...receipt,
            note: 'موافقة على طلب صرف',
          },
        });
      } else {
        await tx.payoutRecord.update({
          where: { id: record.id },
          data: { amount: { increment: request.amount }, receiptFile: receipt?.receiptFile ?? undefined, receiptData: receipt?.receiptData ?? undefined, receiptMime: receipt?.receiptMime ?? undefined },
        });
      }

      if (request.tripId) {
        await tx.payoutRecordItem.create({
          data: { payoutRecordId: record.id, tripId: request.tripId },
        });
      }
    });

    this.wsGateway.emitToCompany(request.companyId, WS_EVENTS.NOTIFICATION_NEW, {
      type: 'PAYOUT_REQUEST',
      title: 'تمت الموافقة على طلب الصرف',
      body: `تمت الموافقة على طلب الصرف بمبلغ ${Math.round(Number(request.amount))} جنيه`,
    });

    await this.notifications.create({
      userId: request.companyId,
      type: 'PAYOUT_REQUEST',
      title: 'تمت الموافقة على طلب الصرف',
      body: `تمت الموافقة على طلب الصرف بمبلغ ${Math.round(Number(request.amount))} جنيه`,
      emitTo: `company:${request.companyId}`,
    });

    return { message: 'تم قبول طلب الصرف بنجاح' };
  }

  async rejectRequest(requestId: string) {
    const request = await this.prisma.payoutRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('طلب الصرف غير موجود');
    if (request.status !== 'PENDING') throw new BadRequestException('يمكن رفض الطلبات المعلقة فقط');

    await this.prisma.payoutRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    this.wsGateway.emitToCompany(request.companyId, WS_EVENTS.NOTIFICATION_NEW, {
      type: 'PAYOUT_REQUEST',
      title: 'تم رفض طلب الصرف',
      body: 'تم رفض طلب الصرف الخاص بك',
    });

    await this.notifications.create({
      userId: request.companyId,
      type: 'PAYOUT_REQUEST',
      title: 'تم رفض طلب الصرف',
      body: 'تم رفض طلب الصرف الخاص بك',
      emitTo: `company:${request.companyId}`,
    });

    return { message: 'تم رفض طلب الصرف' };
  }

  async getHistory() {
    const records = await this.prisma.payoutRecord.findMany({
      include: {
        Company: { select: { name: true } },
        Items: {
          include: {
            Trip: { select: { fromCity: true, toCity: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: records.map(r => ({
        id: r.id,
        amount: Math.round(Number(r.amount)),
        note: r.note,
        receiptFile: r.receiptFile,
        receiptData: r.receiptData,
        receiptMime: r.receiptMime,
        createdAt: r.createdAt,
        company: { name: r.Company?.name ?? '—' },
        items: r.Items.map(i => ({
          trip: i.Trip ? { fromCity: i.Trip.fromCity, toCity: i.Trip.toCity } : null,
        })),
      })),
    };
  }

  async getStats() {
    const [companies, unpaidTrips, pendingRequests, paidRecords] = await Promise.all([
      this.prisma.users.findMany({
        where: { role: 'COMPANY' as any, isActive: true },
        include: {
          Bus: {
            include: {
              Trip: {
                include: {
                  Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
                  PayoutRecordItem: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.trip.findMany({
        where: { PayoutRecordItem: { none: {} } },
        include: {
          Booking: { where: { status: 'CONFIRMED' }, include: { Payment: true } },
        },
      }),
      this.prisma.payoutRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.payoutRecord.findMany(),
    ]);

    let totalUnpaid = 0;
    for (const trip of unpaidTrips) {
      for (const b of trip.Booking) {
        totalUnpaid += Number(b.Payment?.companyAmount ?? 0);
      }
    }

    const totalPaid = paidRecords.reduce((s, r) => s + Number(r.amount), 0);
    const totalCompanies = companies.filter(c => {
      let hasUnpaid = false;
      for (const bus of c.Bus) {
        for (const trip of bus.Trip) {
          if (trip.PayoutRecordItem.length === 0 && trip.Booking.length > 0) {
            hasUnpaid = true;
            break;
          }
        }
        if (hasUnpaid) break;
      }
      return hasUnpaid || pendingRequests > 0;
    }).length;

    return {
      data: {
        totalUnpaid: Math.round(totalUnpaid),
        totalPaid: Math.round(totalPaid),
        pendingRequests,
        totalCompanies,
      },
    };
  }
}
