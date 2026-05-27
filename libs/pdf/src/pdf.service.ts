import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '@app/prisma';

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);
  private outputDir = './upload';

  constructor(private readonly prisma: PrismaService) {}

  async generateTicket(
    bookingId: string,
    paymentData?: any,
  ): Promise<{ publicUrl: string; filePath: string }> {
    const outputDir = path.resolve(this.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `ticket_${bookingId}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const publicUrl = `/upload/${filename}`;

    const payment =
      paymentData ??
      (await this.prisma.payment.findUnique({
        where: { bookingId: bookingId },
        include: {
          Booking: {
            include: {
              Trip: { include: { Bus: true } },
            },
          },
        },
      }));

    if (!payment) {
      throw new Error('الحجز غير موجود');
    }

    const html = this.buildTicketHTML(payment);

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, {
          waitUntil: 'networkidle0',
        });
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm',
          },
        });
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.warn('PDF generation failed', error);
      fs.writeFileSync(outputPath, 'PDF placeholder');
    }

    return { publicUrl, filePath: outputPath };
  }

  async generatePassengerList(
    trip: any,
    bookings: any[],
  ): Promise<{ publicUrl: string; filePath: string }> {
    const outputDir = path.resolve(this.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const tripId = trip.id;
    const filename = `passengers_${tripId}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const publicUrl = `/upload/${filename}`;

    const arabicDigits: Record<string, string> = {
      '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
      '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
    };

    const toArabicNum = (n: any): string => String(n).replace(/[0-9]/g, d => arabicDigits[d]);

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];

    const fmtDate = (val: any): string => {
      if (!val) return '—';
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return `${toArabicNum(d.getDate())} ${arabicMonths[d.getMonth()]} ${toArabicNum(d.getFullYear())}`;
    };

    const fmtTime = (val: any): string => {
      if (!val) return '—';
      if (val instanceof Date && !isNaN(val.getTime())) {
        return `${toArabicNum(val.getHours())}:${toArabicNum(val.getMinutes())}`;
      }
      const str = String(val);
      if (/^\d{1,2}:\d{2}/.test(str)) {
        const [h, m] = str.split(':');
        return `${toArabicNum(h)}:${toArabicNum(m)}`;
      }
      return str;
    };

    const rows = bookings.flatMap((b: any) => {
      const passengers = Array.isArray(b.passenger)
        ? b.passenger
        : [b.passenger].filter(Boolean);
      return passengers.map((p: any, i: number) => {
        const seatNumber = Array.isArray(b.seatNumbers)
          ? toArabicNum(b.seatNumbers[i])
          : toArabicNum(b.seatNumbers);
        const genderLabel =
          p.gender === 'MALE' ? 'ذكر' : p.gender === 'FEMALE' ? 'أنثى' : '—';
        return {
          seatNumber,
          name: p.name || '—',
          age: p.age != null ? toArabicNum(p.age) : '—',
          gender: genderLabel,
        };
      });
    });

    const rowsHtml = rows
      .map(
        (r: any) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #D1D5DB;text-align:center;font-size:13px;">${r.seatNumber}</td>
        <td style="padding:8px 12px;border:1px solid #D1D5DB;text-align:center;font-size:13px;">${r.name}</td>
        <td style="padding:8px 12px;border:1px solid #D1D5DB;text-align:center;font-size:13px;">${r.age}</td>
        <td style="padding:8px 12px;border:1px solid #D1D5DB;text-align:center;font-size:13px;">${r.gender}</td>
      </tr>
    `,
      )
      .join('');

    const primaryColor = '#8B5E3C';
    const primaryLight = '#D4A574';
    const primaryBg = '#F5EDE3';
    const primaryDark = '#6B4226';
    const textDark = '#4A3520';

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="utf-8"><style>
  body { font-family: 'DejaVu Sans', sans-serif; margin:0; padding:20px; }
  h1 { font-size:20px; color:${primaryColor}; text-align:center; margin-bottom:8px; }
  .trip-info { text-align:center; font-size:14px; color:#374151; margin-bottom:20px; }
  table { width:100%; border-collapse:collapse; }
  th { background:${primaryColor}; color:#fff; padding:10px 12px; font-size:13px; border:1px solid ${primaryColor}; }
  td { padding:8px 12px; border:1px solid #D1D5DB; text-align:center; font-size:13px; }
  tr:nth-child(even) { background:${primaryBg}; }
  .count { text-align:center; font-size:12px; color:#6B7280; margin-top:12px; }
</style></head>
<body>
  <h1>قائمة الركاب</h1>
  <div class="trip-info">
    ${trip.fromCity || ''} ← ${trip.toCity || ''} — ${fmtDate(trip.departureDate)} ${fmtTime(trip.departureTime)}
  </div>
  <table>
    <thead>
      <tr>
        <th>رقم المقعد</th>
        <th>الاسم</th>
        <th>العمر</th>
        <th>الجنس</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9CA3AF;">لا يوجد ركاب</td></tr>'}
    </tbody>
  </table>
  <div class="count">إجمالي الركاب: ${toArabicNum(rows.length)}</div>
</body>
</html>`;

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
        });
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.warn('Passenger list PDF generation failed', error);
      fs.writeFileSync(outputPath, 'PDF placeholder');
    }

    return { publicUrl, filePath: outputPath };
  }

  private buildTicketHTML(payment: any): string {
    const booking = payment.Booking;
    const trip = booking.Trip;
    const bus = trip?.Bus;
    const passengers = Array.isArray(booking?.passenger)
      ? booking?.passenger
      : [booking?.passenger ?? {}];

    const fmtDate = (val: any): string => {
      if (!val) return '—';
      return new Date(val).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const fmtTime = (val: any): string => {
      if (!val) return '—';
      const date = new Date();
      const [hours, minutes] = val.split(':').map(Number);
      date.setHours(hours);
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return new Date(date).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    const plate = bus?.plate
      ? typeof bus.plate === 'string'
        ? JSON.parse(bus.plate)
        : bus.plate
      : null;

    const plateHTML = plate
      ? `
        <div style="
          display:inline-flex;
          flex-direction:column;
          align-items:center;
          border:2.5px solid #0D9488;
          border-radius:6px;
          overflow:hidden;
          min-width:90px;
        ">
          <div style="
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
            padding:4px 10px;
            background:#CCFBF1;
            width:100%;
          ">
            <span style="
              font-size:13px;
              font-weight:700;
              color:#134E4A;
              direction:rtl;
            ">
              ${plate.arabic ?? ''}
            </span>
            <span style="
              width:1px;
              height:16px;
              background:#0D9488;
              display:inline-block;
            "></span>
            <span style="
              font-size:13px;
              font-weight:700;
              color:#134E4A;
              direction:ltr;
            ">
              ${plate.english ?? ''}
            </span>
          </div>
          <div style="
            padding:3px 10px;
            background:#0D9488;
            width:100%;
            text-align:center;
          ">
            <span style="
              font-size:14px;
              font-weight:700;
              color:#ffffff;
              letter-spacing:2px;
            ">
              ${plate.numbers ?? ''}
            </span>
          </div>
        </div>
      `
      : '<span style="color:#5EEAD4;font-size:12px">—</span>';

    const passengerRows = passengers
      .map(
        (p: any, i: number) => `
        <tr style="
          border-bottom:1px solid #99F6E4;
          background:${i % 2 === 0 ? '#ffffff' : '#F0FDFA'};
        ">
          <td style="
            padding:10px 14px;
            text-align:right;
            font-size:13px;
            color:#134E4A;
            font-weight:600;
          ">${p.name ?? '—'}</td>
          <td style="
            padding:10px 14px;
            text-align:right;
            font-size:13px;
            color:#134E4A;
            font-weight:600;
          ">${p.age ?? '—'}</td>
          <td style="
            padding:10px 14px;
            text-align:center;
            font-size:13px;
            color:#0F766E;
          ">${p.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td>
          <td style="
            padding:10px 14px;
            text-align:center;
          ">
            <span style="
              display:inline-block;
              background:#0D9488;
              color:white;
              font-size:12px;
              font-weight:700;
              padding:3px 10px;
              border-radius:20px;
              min-width:32px;
              text-align:center;
            ">${booking.seatNumbers[i]}</span>
          </td>
        </tr>
      `,
      )
      .join('');

    const methodMap: Record<string, string> = {
      bankak: 'بنكك',
      fawry: 'فوري',
      mashriq: 'المشرق',
      bravo: 'برافو',
    };
    const paymentMethodLabel =
      methodMap[payment?.paymentMethod ?? ''] ?? payment?.paymentMethod ?? '—';

    const totalAmount = payment?.totalAmount
      ? Number(payment.totalAmount).toLocaleString('ar-SA')
      : '—';

    const ticketPrice = Number(payment.ticketPrice).toLocaleString('ar-SA');
    const platformFee = Number(payment.platformFeeAmount).toLocaleString(
      'ar-SA',
    );
    const currency = 'جنيه سوداني';
    const bookingDate = fmtDate(booking.createdAt);

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Tajawal', sans-serif;
      background: #F0FDFA;
      direction: rtl;
      color: #134E4A;
      font-size: 14px;
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .ticket {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #99F6E4;
      overflow: hidden;
      box-shadow:
        0 4px 24px rgba(13,148,136,0.10),
        0 1px 4px  rgba(13,148,136,0.06);
      max-width: 720px;
      margin: 0 auto;
    }
    .ticket-header {
      background: linear-gradient(
        135deg, #0D9488 0%, #0F766E 100%
      );
      padding: 28px 32px 24px;
      text-align: center;
      position: relative;
    }
    .ticket-header::after {
      content: '';
      display: block;
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 20px;
      background: #ffffff;
      clip-path: ellipse(55% 100% at 50% 100%);
    }
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .header-logo-icon {
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .header-logo-text {
      font-size: 30px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header-sub {
      font-size: 13px;
      color: rgba(255,255,255,0.80);
      font-weight: 400;
      margin-top: 2px;
    }
    .header-booking-id {
      margin-top: 14px;
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.30);
      border-radius: 20px;
      padding: 4px 16px;
      font-size: 11px;
      color: rgba(255,255,255,0.90);
      letter-spacing: 0.5px;
    }
    .ticket-body {
      padding: 32px 28px 24px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #0D9488;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #99F6E4;
    }
    .section {
      margin-bottom: 24px;
    }
    .card {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 12px;
      padding: 16px;
    }
    .bus-details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .bus-name {
      font-size: 18px;
      font-weight: 700;
      color: #134E4A;
    }
    .bus-meta {
      font-size: 12px;
      color: #0F766E;
      margin-top: 4px;
    }
    .bus-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .trip-section {
      display: grid;
      grid-template-columns: 1fr 40px 1fr;
      gap: 0;
      align-items: stretch;
    }
    .trip-side {
      padding: 16px;
    }
    .trip-side-departure {
      border-radius: 12px 0 0 12px;
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-left: none;
    }
    .trip-side-arrival {
      border-radius: 0 12px 12px 0;
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-right: none;
    }
    .trip-divider {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0D9488;
      position: relative;
    }
    .trip-divider-arrow {
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
    }
    .trip-label {
      font-size: 10px;
      font-weight: 600;
      color: #0D9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .trip-state {
      font-size: 11px;
      color: #5EEAD4;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .trip-city {
      font-size: 20px;
      font-weight: 800;
      color: #134E4A;
      line-height: 1.2;
      margin-bottom: 3px;
    }
    .trip-station {
      font-size: 11px;
      color: #0F766E;
      margin-bottom: 12px;
    }
    .trip-time-block {
      margin-top: 4px;
    }
    .trip-date {
      font-size: 12px;
      color: #0F766E;
      font-weight: 500;
    }
    .trip-time {
      font-size: 22px;
      font-weight: 700;
      color: #0D9488;
      line-height: 1.2;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #99F6E4;
    }
    thead tr {
      background: linear-gradient(
        135deg, #0D9488, #0F766E
      );
    }
    thead th {
      padding: 11px 14px;
      text-align: right;
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.3px;
    }
    .payment-table tbody tr td:first-child {
      font-weight: 600;
      color: #0F766E;
    }
    .payment-table tbody tr td:last-child {
      font-weight: 700;
      color: #134E4A;
      text-align: left;
      direction: ltr;
    }
    .payment-table tbody tr:last-child {
      background: #CCFBF1 !important;
    }
    .payment-table tbody tr:last-child td {
      font-size: 15px;
      font-weight: 800;
      color: #0D9488 !important;
    }
    .dashed-divider {
      border: none;
      border-top: 2px dashed #99F6E4;
      margin: 24px 0;
    }
    .ticket-footer {
      background: linear-gradient(
        135deg, #0D9488 0%, #0F766E 100%
      );
      padding: 16px 28px;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: rgba(255,255,255,0.90);
      font-weight: 400;
    }
    .footer-booking-ref {
      margin-top: 6px;
      font-size: 10px;
      color: rgba(255,255,255,0.60);
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
<div class="ticket">

  <div class="ticket-header">
    <div class="header-logo">
      <span class="header-logo-text">رحلة</span>
    </div>
    <div class="header-sub">
      تذكرة سفر — Bus Ticket
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:6px;">
      تاريخ الحجز: ${bookingDate}
    </div>
  </div>

  <div class="ticket-body">

    <div class="section">
      <div class="section-title">تفاصيل الحافلة</div>
      <div class="card">
        <div class="bus-details">
          <div>
            <div class="bus-name">${bus?.name ?? '—'}</div>
            <div class="bus-meta">عدد المقاعد: ${bus?.chairs ?? '—'} مقعد</div>
          </div>
          <div class="bus-right">
            <div style="font-size:10px;color:#5EEAD4;font-weight:600;text-align:center;margin-bottom:4px;letter-spacing:0.5px;">
              رقم اللوحة
            </div>
            ${plateHTML}
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">تفاصيل الرحلة</div>
      <div class="trip-section">
        <div class="trip-side trip-side-departure">
          <div class="trip-label">المغادرة</div>
          <div class="trip-state">${trip?.fromState ?? ''}</div>
          <div class="trip-city">${trip?.fromCity ?? '—'}</div>
          <div class="trip-station">${trip?.fromStation ?? ''}</div>
          <div class="trip-time-block">
            <div class="trip-date">${fmtDate(trip?.departureDate)}</div>
            <div class="trip-time">${fmtTime(trip?.departureTime)}</div>
          </div>
        </div>
        <div class="trip-divider">
          <div class="trip-divider-arrow">←</div>
        </div>
        <div class="trip-side trip-side-arrival" style="text-align:left;direction:ltr;">
          <div class="trip-label" style="text-align:left">الوصول</div>
          <div class="trip-state" style="text-align:left">${trip?.toState ?? ''}</div>
          <div class="trip-city" style="text-align:left">${trip?.toCity ?? '—'}</div>
          <div class="trip-station" style="text-align:left">${trip?.toStation ?? ''}</div>
          <div class="trip-time-block">
            <div class="trip-date" style="text-align:left">${fmtDate(trip?.arrivalDate)}</div>
            <div class="trip-time" style="text-align:left">${fmtTime(trip?.arrivalTime)}</div>
          </div>
        </div>
      </div>
    </div>

    <hr class="dashed-divider">

    <div class="section">
      <div class="section-title">بيانات الركاب</div>
      <table>
        <thead>
          <tr>
            <th style="text-align:right">اسم الراكب</th>
            <th style="text-align:center">العمر</th>
            <th style="text-align:center">الجنس</th>
            <th style="text-align:center">رقم المقعد</th>
          </tr>
        </thead>
        <tbody>
          ${passengerRows}
        </tbody>
      </table>
    </div>

    <hr class="dashed-divider">

    <div class="section">
      <div class="section-title">تفاصيل الدفع</div>
      <table class="payment-table">
        <thead>
          <tr>
            <th style="text-align:right">البيان</th>
            <th style="text-align:left;direction:ltr">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #99F6E4;">
            <td style="padding:10px 14px;font-size:13px;">سعر التذكرة الواحدة</td>
            <td style="padding:10px 14px;font-size:13px;text-align:left;direction:ltr;">${ticketPrice} ${currency}</td>
          </tr>
          <tr style="border-bottom:1px solid #99F6E4;">
            <td style="padding:10px 14px;font-size:13px;">رسوم المنصة</td>
            <td style="padding:10px 14px;font-size:13px;text-align:left;direction:ltr;">${platformFee} ${currency}</td>
          </tr>
          <tr style="border-bottom:1px solid #99F6E4;background:#F0FDFA;">
            <td style="padding:10px 14px;font-size:13px;">عدد المقاعد المحجوزة</td>
            <td style="padding:10px 14px;font-size:13px;text-align:left;direction:ltr;">${passengers.length} مقعد</td>
          </tr>
          <tr style="border-bottom:1px solid #99F6E4;">
            <td style="padding:10px 14px;font-size:13px;">طريقة الدفع</td>
            <td style="padding:10px 14px;font-size:13px;text-align:left;direction:ltr;">${paymentMethodLabel}</td>
          </tr>
          <tr style="background:#CCFBF1;">
            <td style="padding:12px 14px;font-size:15px;font-weight:800;color:#0D9488;">الإجمالي المدفوع</td>
            <td style="padding:12px 14px;font-size:15px;font-weight:800;color:#0D9488;text-align:left;direction:ltr;">${totalAmount} ${currency}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>

  <div class="ticket-footer">
    <div class="footer-text">يُرجى الحضور قبل موعد الانطلاق بساعة دقيقة</div>
  </div>

</div>
</body>
</html>
    `;
  }
}
