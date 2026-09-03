import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/prisma';
import { PDFService } from '@app/pdf';
import { UsersService } from '../users/service/users.service';
import type { Request, Response } from 'express';

/** Escapes HTML-special characters in user-supplied values before they are
 *  interpolated into the ticket template (stored-XSS defense). */
function esc(value: unknown): string {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly pdfService: PDFService,
  ) {}

  @Get('pdf/:id')
  async getTicketPdf(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const authHeader = req.headers.authorization;
    token =
      token ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (!token) throw new UnauthorizedException('Token is required');

    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET! });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (this.usersService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Simplified: Prisma now correctly handles Bytes column type for pdfData
    // (Fixed schema mismatch that was causing corruption)
    let booking: any;
    let pdfData: Buffer | null = null;
    try {
      booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          TicketPDF: {
            select: {
              id: true,
              bookingId: true,
              ticketUrl: true,
              generatedAt: true,
            },
          },
          Customer: { select: { name: true } },
        },
      });
    } catch (e: any) {
      // Basic error handling - corruption-specific logic removed as root cause is fixed
      throw e;
    }

    // Get pdfData directly from the relation (now properly typed as Buffer)
    if (booking?.TicketPDF) {
      pdfData = booking.TicketPDF.pdfData ?? null;
    }

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== payload.id)
      throw new UnauthorizedException('Not your ticket');
    if (booking.status !== 'CONFIRMED')
      throw new NotFoundException('No ticket available');

    // Re-generate on the fly if the ticket row is missing or was never
    // persisted (e.g. rows created before this column existed, or when the
    // ephemeral upload/ was wiped on a Render restart but no regeneration
    // had run). This self-heals every existing confirmed booking.
    if (!pdfData) {
      const regenerated = await this.pdfService.generateTicket(id);
      const pdfBuffer = regenerated.buffer ?? null;
      if (pdfBuffer) {
        const data = {
          ticketUrl: regenerated.publicUrl,
          pdfData: pdfBuffer ? new Uint8Array(pdfBuffer) : null,
          generatedAt: new Date(),
        };
        try {
          await this.prisma.ticketPDF.upsert({
            where: { bookingId: id },
            create: {
              ...data,
              Booking: {
                connect: { id: id },
              },
            },
            update: data,
          });
          pdfData = pdfBuffer;
        } catch (e: any) {
          // General error handling for upsert failures - keeps retry logic as precaution
          // during schema migration period or for other unexpected issues
          if (String(e?.message || '').includes('pdfData')) {
            await this.prisma.$executeRawUnsafe(
              `UPDATE "TicketPDF" SET "pdfData" = NULL WHERE "bookingId" = $1`,
              id,
            );
            await this.prisma.ticketPDF.upsert({
              where: { bookingId: id },
              create: {
                ...data,
                Booking: {
                  connect: { id: id },
                },
              },
              update: data,
            });
            pdfData = pdfBuffer;
          } else throw e;
        }
      }
    }

    if (!pdfData) throw new NotFoundException('Ticket PDF is not available');

    // pdfData is now a Buffer (from Bytes column), use it directly
    const pdfBuffer = pdfData;
    const orderRef = booking.id.slice(0, 8).toUpperCase();
    // Customer names may contain non-ASCII (Arabic) characters, which Node
    // rejects in a raw HTTP header value. Keep `filename` ASCII-only and carry
    // the full, percent-encoded name in RFC 5987 `filename*` (UTF-8) so
    // capable browsers still save an identifiable, named file.
    const nameForFile = `ticket_${orderRef}_${(booking.Customer?.name ?? 'ticket') as string}`;
    const asciiName = nameForFile
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\/\r\n]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const encodedName = encodeURIComponent(nameForFile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodedName}.pdf`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);
  }

  @Get('html/:id')
  async getTicketHtml(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const authHeader = req.headers.authorization;
    token =
      token ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (!token) throw new UnauthorizedException('Token is required');

    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET! });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Logged-out sessions must not keep serving tickets.
    if (this.usersService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    let booking: any;
    try {
      booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          Trip: { include: { Bus: true } },
          Payment: true,
          TicketPDF: {
            select: {
              id: true,
              bookingId: true,
              ticketUrl: true,
              generatedAt: true,
            },
          },
        },
      });
    } catch (e: any) {
      // Basic error handling - corruption-specific logic removed as root cause is fixed
      // (Schema mismatch between @db.Text and actual BYTEA column has been resolved)
      throw e;
    }

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== payload.id)
      throw new UnauthorizedException('Not your ticket');

    const trip = booking.Trip;
    const bus = trip?.Bus;
    const payment = booking.Payment;
    const passengers = (booking.passenger ?? []) as any[];
    const seatNumbers = booking.seatNumbers ?? [];
    const plate = bus?.plate ? bus.plate : null;

    const fmt = (n: number) =>
      String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
    const dt = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '—';
    const tm = (t: any) => (t ? t.slice(0, 5) : '—');

    function duration(): string {
      if (!trip?.departureDate || !trip?.arrivalDate) return '—';
      const diffMs =
        new Date(trip.arrivalDate).getTime() -
        new Date(trip.departureDate).getTime();
      if (diffMs <= 0) return '—';
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return `${hrs}h ${mins}m`;
    }

    function plateHtml(): string {
      if (!plate) return '<div class="value">—</div>';
      const en = esc((plate.english || '').toUpperCase());
      const ar = esc(plate.arabic || '');
      const num = esc(plate.numbers || '');
      return `<div class="plate">
        <span class="plate-top">${en}</span>
        <span class="plate-num">${num}</span>
        <span class="plate-bot">${ar}</span>
      </div>`;
    }

    function passengersTable(): string {
      if (!passengers.length) return '<div class="muted">لا يوجد مسافرون</div>';
      const rows = passengers
        .map((p: any, i: number) => {
          const name = p.name ? esc(p.name) : '—';
          const seat = seatNumbers[i] ? fmt(seatNumbers[i]) : '—';
          const age = p.age ? fmt(p.age) : '—';
          const gender =
            p.gender === 'MALE' ? 'ذكر' : p.gender === 'FEMALE' ? 'أنثى' : '—';
          return `<tr><td>${name}</td><td>${age}</td><td>${gender}</td><td class="ta-center">${seat}</td></tr>`;
        })
        .join('');
      return `<table class="passengers-table">
        <thead><tr><th>الاسم</th><th>العمر</th><th>الجنس</th><th class="ta-center">المقعد</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const orderId = esc(booking.id.slice(0, 8).toUpperCase());
    const isPaid = payment?.status === 'SUCCESS';
    const paymentBadge = isPaid
      ? `<span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          تم الدفع
        </span>`
      : payment
        ? '<span class="badge badge-pending">بانتظار تأكيد الدفع</span>'
        : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تذكرة السفر</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f4f4f4;
    color: #134E4A;
    padding: 12px;
    display: flex;
    justify-content: center;
  }
  .ticket {
    max-width: 420px;
    width: 100%;
    background: #FFFFFF;
    border-radius: 24px;
    overflow: hidden;
  }
  .header {
    background: #0D9488;
    color: #fff;
    padding: 20px 24px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
  .header .order { font-size: 11px; opacity: 0.8; }
  .body { padding: 20px 24px; }

  .section { margin-bottom: 20px; }
  .section:last-child { margin-bottom: 0; }
  .section-title {
    font-size: 13px; font-weight: 700; color: #0D9488;
    margin-bottom: 10px; letter-spacing: 0.02em;
    display: flex; align-items: center; gap: 6px;
  }

  .info-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: start;
  }
  .info-col { display: flex; flex-direction: column; gap: 2px; }
  .info-col-r { text-align: right; }
  .info-col-l { text-align: left; }
  .info-label { font-size: 10px; color: #0F766E; text-transform: uppercase; letter-spacing: 0.04em; }
  .info-val { font-size: 14px; font-weight: 700; color: #134E4A; line-height: 1.3; }
  .info-sub { font-size: 11px; color: #0F766E; }
  .info-divider {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 0 4px;
  }
  .info-divider svg { display: block; }
  .info-divider span { font-size: 10px; color: #0F766E; margin-top: 4px; white-space: nowrap; }

  .plate {
    display: inline-flex; flex-direction: column; align-items: center;
    background: #FEF9E7; border: 2px solid #134E4A; border-radius: 6px;
    padding: 4px 14px; min-width: 120px;
  }
  .plate-top { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; }
  .plate-num { font-size: 18px; font-weight: 800; line-height: 1.3; direction: ltr; }
  .plate-bot { font-size: 13px; font-weight: 700; }

  .bus-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .bus-name { font-size: 15px; font-weight: 700; }

  .passengers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .passengers-table th {
    background: #CCFBF1;
    color: #134E4A;
    font-weight: 600;
    padding: 8px 10px;
    text-align: right;
  }
  .passengers-table th:first-child { border-radius: 8px 0 0 0; }
  .passengers-table th:last-child { border-radius: 0 8px 0 0; }
  .passengers-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #CCFBF1;
  }
  .passengers-table tr:last-child td { border-bottom: none; }
  .ta-center { text-align: center !important; }

  .pay-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 0;
  }
  .pay-label { font-size: 12px; color: #0F766E; }
  .pay-value { font-size: 14px; font-weight: 700; }
  .pay-amount { font-size: 20px; font-weight: 800; color: #0D9488; }
  .pay-hr { border: none; border-top: 1px solid #CCFBF1; margin: 6px 0; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #CCFBF1;
    color: #0D9488;
  }
  .badge svg { width: 14px; height: 14px; }
  .badge-pending {
    background: #FEF3C7;
    color: #B45309;
  }

  .notice {
    background: #CCFBF1;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 11px;
    color: #0F766E;
    line-height: 1.6;
  }
  .notice strong { color: #EA580C; font-weight: 700; }

  .muted { font-size: 12px; color: #0F766E; }
</style>
</head>
<body>
<div class="ticket">
  <div class="header">
    <h1>تذكرة السفر</h1>
    <div class="order">رقم ${orderId}</div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        معلومات الرحلة
      </div>
      <div class="info-row">
        <div class="info-col info-col-r">
          <div class="info-label">المغادرة</div>
          <div class="info-val">${esc(trip?.fromCity) || '—'}</div>
          <div class="info-sub">${esc(trip?.fromState)} ${esc(trip?.fromStation)}</div>
          <div class="info-sub">${dt(trip?.departureDate)}</div>
          <div class="info-sub" style="font-weight:600;color:#134E4A">${tm(trip?.departureTime)}</div>
        </div>
        <div class="info-divider">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          <span>${duration()}</span>
        </div>
        <div class="info-col info-col-l">
          <div class="info-label">الوصول</div>
          <div class="info-val">${esc(trip?.toCity) || '—'}</div>
          <div class="info-sub">${esc(trip?.toState)} ${esc(trip?.toStation)}</div>
          <div class="info-sub">${dt(trip?.arrivalDate)}</div>
          <div class="info-sub" style="font-weight:600;color:#134E4A">${tm(trip?.arrivalTime)}</div>
        </div>
      </div>
    </div>

    ${
      bus
        ? `
    <div class="section">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/></svg>
        الحافلة
      </div>
      <div class="bus-row">
        <span class="bus-name">${bus.name || '—'}</span>
        ${plateHtml()}
      </div>
    </div>
    `
        : ''
    }

    <div class="section">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        المسافرون
      </div>
      ${passengersTable()}
    </div>

    ${
      payment
        ? `
    <div class="section">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        تفاصيل الدفع
      </div>
      <div class="pay-row"><span class="pay-label">طريقة الدفع</span><span class="pay-value">${esc(payment.paymentMethod) || '—'}</span></div>
      <hr class="pay-hr">
      <div class="pay-row"><span class="pay-label">المدفوع</span><span class="pay-amount">${fmt(Math.round(Number(payment.totalAmount) || 0))} ج</span></div>
    </div>
    `
        : ''
    }

    <div class="section">
      <div class="notice">
        <strong>مهم:</strong> التواجد قبل المغادرة بساعة على الأقل.<br>
        <strong>ملاحظة:</strong> التذكرة صالحة فقط حتى تاريخ الرحلة.
      </div>
    </div>

    <div style="display:flex;justify-content:center;margin-top:4px">
      ${paymentBadge}
    </div>
  </div>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    // The customer app renders the ticket view inside an <iframe>, which is
    // blocked by the global X-Frame-Options: DENY set in main.ts. Remove it
    // here (controller runs after that middleware) so the ticket can render.
    res.removeHeader('X-Frame-Options');
    res.send(html);
  }
}
