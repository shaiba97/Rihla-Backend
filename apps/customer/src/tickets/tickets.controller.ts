import { Controller, Get, Param, Query, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/prisma';
import type { Response } from 'express';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('html/:id')
  async getTicketHtml(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) throw new UnauthorizedException('Token is required');

    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET! });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        Trip: { include: { Bus: true } },
        Payment: true,
        TicketPDF: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== payload.id) throw new UnauthorizedException('Not your ticket');

    const trip = booking.Trip;
    const bus = trip?.Bus;
    const payment = booking.Payment;
    const passengers = (booking.passenger ?? []) as any[];
    const seatNumbers = (booking.seatNumbers ?? []) as number[];

    const fmt = (n: number) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
    const dt = (d: any) => d ? new Date(d).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const tm = (t: any) => t ? t.slice(0, 5) : '—';
    const pf = payment && payment.platformFeeAmount
      ? '<div class="row"><span class="label">رسوم المنصة</span><span class="value">' + fmt(Math.round(Number(payment.platformFeeAmount))) + ' ج</span></div>'
      : '';
    const ca = payment && payment.companyAmount
      ? '<div class="row"><span class="label">قيمة التذكرة</span><span class="value">' + fmt(Math.round(Number(payment.companyAmount))) + ' ج</span></div>'
      : '';
    let passengersHtml = '<div class="row"><span class="label">لا يوجد مسافرون</span></div>';
    if (passengers.length > 0) {
      passengersHtml = passengers.map((p: any, i: number) => {
        const ageStr = p.age ? fmt(p.age) : '—';
        return '<div class="passenger">'
          + '<div class="row"><span class="label">الاسم</span><span class="value">' + (p.name || '—') + '</span></div>'
          + '<div class="row"><span class="label">المقعد</span><span class="value">' + fmt(seatNumbers[i] || i + 1) + '</span></div>'
          + '<div class="row"><span class="label">العمر</span><span class="value">' + ageStr + '</span></div>'
          + '</div>';
      }).join('');
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تذكرة السفر</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    padding: 16px;
    display: flex;
    justify-content: center;
  }
  .ticket {
    max-width: 480px;
    width: 100%;
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .header {
    background: #4F46E5;
    color: #fff;
    padding: 20px;
    text-align: center;
  }
  .header h1 { font-size: 20px; font-weight: 800; }
  .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
  .body { padding: 16px 20px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .value { font-weight: 600; text-align: left; }
  .section-title { font-size: 14px; font-weight: 700; color: #4F46E5; margin: 12px 0 8px; }
  .passenger { background: #f8fafc; border-radius: 12px; padding: 10px 14px; margin-bottom: 8px; }
  .passenger .row { border-bottom-color: #e2e8f0; padding: 4px 0; }
  .footer { background: #f1f5f9; padding: 12px 20px; text-align: center; font-size: 11px; color: #94a3b8; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-success { background: #dcfce7; color: #166534; }
  .amount { font-size: 16px; font-weight: 800; color: #4F46E5; }
</style>
</head>
<body>
<div class="ticket">
  <div class="header">
    <h1>تذكرة السفر</h1>
    <p>رقم الحجز: ${booking.id.slice(0, 8)}…</p>
  </div>
  <div class="body">
    <div class="section-title">معلومات الرحلة</div>
    <div class="row"><span class="label">من</span><span class="value">${trip?.fromCity || '—'} ${trip?.fromState || ''}</span></div>
    <div class="row"><span class="label">إلى</span><span class="value">${trip?.toCity || '—'} ${trip?.toState || ''}</span></div>
    <div class="row"><span class="label">تاريخ الانطلاق</span><span class="value">${dt(trip?.departureDate)}</span></div>
    <div class="row"><span class="label">وقت الانطلاق</span><span class="value">${tm(trip?.departureTime)}</span></div>
    <div class="row"><span class="label">تاريخ الوصول</span><span class="value">${dt(trip?.arrivalDate)}</span></div>
    <div class="row"><span class="label">وقت الوصول</span><span class="value">${tm(trip?.arrivalTime)}</span></div>
    <div class="row"><span class="label">محطة الانطلاق</span><span class="value">${trip?.fromStation || '—'}</span></div>
    <div class="row"><span class="label">محطة الوصول</span><span class="value">${trip?.toStation || '—'}</span></div>

    ${bus ? `
    <div class="section-title">الحافلة</div>
    <div class="row"><span class="label">اسم الحافلة</span><span class="value">${bus.name || '—'}</span></div>
    <div class="row"><span class="label">رقم اللوحة</span><span class="value">${bus.plate || '—'}</span></div>
    ` : ''}

    <div class="section-title">المسافرون</div>
    ${passengersHtml}

    ${payment ? `
    <div class="section-title">تفاصيل الدفع</div>
    ${pf}
    ${ca}
    <div class="row" style="border-bottom: none;"><span class="label">المجموع</span><span class="value amount">${fmt(Math.round(Number(payment.totalAmount) || 0))} ج</span></div>
    ` : ''}

    <div style="text-align: center; margin-top: 16px;">
      <span class="badge badge-success">تم الدفع</span>
    </div>
  </div>
  <div class="footer">
    ${trip?.fromCity || ''} → ${trip?.toCity || ''} &bull; ${dt(trip?.departureDate)}
  </div>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
