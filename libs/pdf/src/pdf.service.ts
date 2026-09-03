import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '@app/prisma';

import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

// The following JS-only packages ship no type definitions; load them via
// require so the build does not need ambient module declarations.
/* eslint-disable @typescript-eslint/no-require-imports */
const fontkit: any = require('@pdf-lib/fontkit');

const arabicReshaper: {
  convertArabic(text: string): string;
} = require('arabic-reshaper');

const bidiFactory: () => {
  getEmbeddingLevels(
    text: string,
    direction?: 'ltr' | 'rtl',
  ): {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  };
  getReorderSegments(
    text: string,
    embeddingLevels: any,
    lineStart?: number,
    lineEnd?: number,
  ): [number, number][];
} = require('bidi-js');

const QRCode: {
  toBuffer(text: string, options?: any): Promise<Buffer>;
} = require('qrcode');
/* eslint-enable @typescript-eslint/no-require-imports */

const bidi = bidiFactory();

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS  (mapped from the approved HTML ticket design)
// ─────────────────────────────────────────────────────────────
const C = {
  primary: hex('00685f'),
  primaryContainer: hex('008378'),
  tertiary: hex('008374'),
  onSurfaceVariant: hex('3d4947'),
  surfaceContainerLow: hex('e9f6f3'),
  outlineVariant: hex('bcc9c6'),
  onPrimary: hex('ffffff'),
  textPrimary: hex('134E4A'),
  gray: hex('6B7280'),
  secondary: hex('316763'),
  onSecondaryContainer: hex('376d69'),
  secondaryContainer: hex('b5ede7'),
};

interface TicketData {
  bookingId: string;
  customerName?: string;
  bus?: any;
  trip?: any;
  passengers?: any[];
  payment?: any;
  seatNumbers?: number[];
  qrData?: string;
}

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);
  private outputDir = './upload';
  constructor(private readonly prisma: PrismaService) {}

  async generateTicket(
    bookingId: string,
    paymentData?: any,
  ): Promise<{ publicUrl: string; filePath: string; buffer: Buffer | null }> {
    void paymentData;
    const outputDir = path.resolve(this.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `ticket_${bookingId}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const publicUrl = `/upload/${filename}`;

    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        Booking: {
          include: {
            Customer: { select: { name: true } },
            Trip: { include: { Bus: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('الحجز غير موجود');
    }

    let buffer: Buffer | null = null;
    try {
      const booking = payment.Booking;
      const trip = booking.Trip;
      const bus = trip?.Bus;
      const passengers = (booking.passenger ?? []) as any[];

      const ticketData: TicketData = {
        bookingId,
        customerName: booking.Customer?.name ?? '',
        bus,
        trip,
        passengers,
        seatNumbers: booking.seatNumbers ?? [],
        payment: {
          platformFeeAmount: payment.platformFeeAmount ?? 0,
          companyAmount: payment.companyAmount ?? 0,
          totalAmount: payment.totalAmount ?? 0,
          price: payment.price ?? 0,
          currency: payment.currency ?? 'جنيه سوداني',
        },
        qrData: `BOOKING:${bookingId}`,
      };

      const buf = await generateTicketBuffer(ticketData);
      buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
      fs.writeFileSync(outputPath, buffer);
      this.logger.log(
        `Ticket saved -> ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`,
      );
    } catch (error: any) {
      const errStack = error?.stack || error?.message || String(error);
      this.logger.error(`فشل في إنشاء ملف PDF للتذكرة ${bookingId}`, errStack);
    }

    return { publicUrl, filePath: outputPath, buffer };
  }

  async generatePassengerList(
    trip: any,
    bookings: any[],
  ): Promise<{ publicUrl: string; filePath: string }> {
    const outputDir = path.resolve(this.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `passengers_${trip.id}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const publicUrl = `/upload/${filename}`;

    try {
      const passengerRows = (bookings || []).flatMap((b: any) => {
        const seats = (b.seatNumbers ?? []) as number[];
        const passengers = (b.passenger ?? []) as any[];
        return passengers.map((p: any, i: number) => ({
          name: p.name || '',
          age: p.age || 0,
          gender: p.gender || '',
          seatNumber: seats[i] || '',
          contact: b.passengerContact || '',
        }));
      });

      const buf = await generatePassengerListBuffer(trip, passengerRows);
      fs.writeFileSync(outputPath, Buffer.from(buf));
      this.logger.log(
        `Passenger list saved -> ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`,
      );
    } catch (error: any) {
      const errStack = error?.stack || error?.message || String(error);
      this.logger.error(
        `فشل في إنشاء ملف PDF لقائمة الركاب ${trip.id}`,
        errStack,
      );
      fs.writeFileSync(outputPath, 'PDF placeholder');
    }

    return { publicUrl, filePath: outputPath };
  }
}

// ─────────────────────────────────────────────────────────────
// COLOR / NUMBER HELPERS
// ─────────────────────────────────────────────────────────────
function hex(v: string) {
  const n = parseInt(v.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function toAr(n: any) {
  return String(n ?? '').replace(/[0-9]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

/** "2026-01-15" → "٢٥ / ١٠ / ٢٠٢٣" style (dd / mm / yyyy) */
function formatDateShort(val: any) {
  if (!val) return '—';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d as any)) return String(val);
  const dd = toAr(String(d.getDate()).padStart(2, '0'));
  const mm = toAr(String(d.getMonth() + 1).padStart(2, '0'));
  const yy = toAr(String(d.getFullYear()));
  return `${dd} / ${mm} / ${yy}`;
}

/** "07:30" or Date → "٠٩:٠٠ ص" */
function formatTime(val: any) {
  if (!val) return '—';
  let h: number, m: number;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
    [h, m] = val.split(':').map(Number);
  } else {
    const d = val instanceof Date ? val : new Date(val);
    h = d.getHours();
    m = d.getMinutes();
  }
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${toAr(String(h12).padStart(2, '0'))}:${toAr(String(m).padStart(2, '0'))} ${period}`;
}

/** 465 → "٤٦٥٫٠٠ جنيه سوداني" */
function formatMoney(amount: any, currency = 'جنيه سوداني') {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  const fixed = n.toFixed(2).replace('.', '٫');
  return `${toAr(fixed)} ${currency}`;
}

function genderLabel(g: any) {
  const map: Record<string, string> = {
    MALE: 'ذكر',
    FEMALE: 'أنثى',
    male: 'ذكر',
    female: 'أنثى',
    M: 'ذكر',
    F: 'أنثى',
  };
  return map[g] || g || '—';
}

// ─────────────────────────────────────────────────────────────
// ARABIC SHAPING + BIDI  (pdf-lib has no shaping; fonts must be
// pre-shaped and reordered into visual order before drawing)
// ─────────────────────────────────────────────────────────────
function asVisual(text: any): string {
  if (text == null || text === '') return '';
  const src = String(text);
  const shaped = arabicReshaper.convertArabic(src);
  const embedding = bidi.getEmbeddingLevels(shaped, 'rtl');
  const chars = shaped.split('');
  bidi
    .getReorderSegments(shaped, embedding)
    .forEach(([s, e]: [number, number]) => {
      const seg = chars.slice(s, e + 1).reverse();
      for (let i = s; i <= e; i++) chars[i] = seg[i - s];
    });
  return chars.join('');
}

// ─────────────────────────────────────────────────────────────
// FONT / LOGO LOADING
// ─────────────────────────────────────────────────────────────
function fontPaths() {
  const cwd = process.cwd();
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'fonts'),
    path.join(__dirname, '..', 'fonts'),
    path.join(__dirname, 'fonts'),
    path.join(cwd, 'fonts'),
  ];
  for (const dir of candidates) {
    const r = path.join(dir, 'Tajawal-Regular.ttf');
    const b = path.join(dir, 'Tajawal-Bold.ttf');
    if (fs.existsSync(r) && fs.existsSync(b)) {
      return { regular: fs.readFileSync(r), bold: fs.readFileSync(b) };
    }
  }
  throw new Error('Tajawal fonts not found. Put them in /backend/fonts/');
}

function logoBytes(): Uint8Array | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'assets', 'companyLogo.png'),
    path.join(__dirname, '..', 'assets', 'companyLogo.png'),
    path.join(__dirname, 'assets', 'companyLogo.png'),
    path.join(cwd, 'assets', 'companyLogo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }
  return null;
}

async function qrPngBytes(text: string): Promise<Uint8Array | null> {
  try {
    const buf = await QRCode.toBuffer(text, {
      type: 'png',
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'Q',
    });
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// DRAWING PRIMITIVES  (pdf-lib manual layout; bottom-left origin)
// ─────────────────────────────────────────────────────────────
interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  reg: PDFFont;
  bold: PDFFont;
  y: number;
}

const PAGE_W = 595.28; // A4 portrait width (pt)
const PAGE_H = 841.89; // A4 portrait height (pt)
const MARGIN = 30;

/** Draw RTL text at RIGHT edge = x, baseline = ctx.y. Returns ctx.y unchanged. */
function draw(
  ctx: Ctx,
  x: number,
  textStr: string,
  size: number,
  opts: {
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    right?: boolean;
    width?: number;
  } = {},
) {
  const t = asVisual(textStr);
  if (!t) return;
  const font = opts.bold === false ? ctx.reg : opts.bold ? ctx.bold : ctx.reg;
  const w = font.widthOfTextAtSize(t, size);
  const dx = opts.right && opts.width != null ? x + (opts.width ?? 0) - w : x;
  ctx.page.drawText(t, {
    x: dx,
    y: ctx.y,
    size,
    font,
    color: opts.color ?? C.textPrimary,
  });
}

function drawCentered(
  ctx: Ctx,
  midX: number,
  textStr: string,
  size: number,
  opts: any = {},
) {
  const t = asVisual(textStr);
  if (!t) return;
  const font = opts.bold === false ? ctx.reg : opts.bold ? ctx.bold : ctx.reg;
  const w = font.widthOfTextAtSize(t, size);
  ctx.page.drawText(t, {
    x: midX - w / 2,
    y: ctx.y,
    size,
    font,
    color: opts.color ?? C.textPrimary,
  });
}

function hLine(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  color: ReturnType<typeof rgb>,
) {
  ctx.page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness: 1,
    color,
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER TICKET  (mirrors the approved HTML design)
// ─────────────────────────────────────────────────────────────
async function generateTicketBuffer(
  ticketData: TicketData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  (doc as any).registerFontkit(fontkit);
  const fonts = fontPaths();
  const reg = await doc.embedFont(fonts.regular);
  const bold = await doc.embedFont(fonts.bold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(1, 1, 1),
  });

  const ctx: Ctx = { doc, page, reg, bold, y: PAGE_H - MARGIN };
  const W = PAGE_W - 2 * MARGIN;

  // Logo (if present)
  const logo = logoBytes();
  if (logo) {
    try {
      const png = await doc.embedPng(logo);
      const aspect = png.height / png.width;
      const lw = 30;
      const lh = lw * aspect;
      page.drawImage(png, {
        x: MARGIN + 2,
        y: ctx.y - lh,
        width: lw,
        height: lh,
      });
    } catch {
      /* logo is optional */
    }
  }

  // Header strip (bg surface-container-low, full width)
  ctx.y -= 4;
  {
    // brand on the right (RTL top)
    draw(ctx, PAGE_W - MARGIN - 2, 'تفية', 24, {
      bold: true,
      color: C.primary,
      right: true,
      width: 200,
    });
    ctx.y -= 20;
    draw(ctx, PAGE_W - MARGIN - 2, 'تذكرة سفر رسمية', 9, {
      color: C.gray,
      right: true,
      width: 200,
    });

    // bus info + plate
    const busName = ticketData.bus?.name || '—';
    const plate = ticketData.bus?.plate || ticketData.bus?.plateNumbers || {};
    const plateParts = [plate.numbers, plate.arabic, plate.english]
      .filter(Boolean)
      .join('   ');
    const plateLtr =
      `${plate.english || ''} ${plate.numbers || ''}`.trim() || plateParts;

    ctx.y -= 26;
    draw(ctx, PAGE_W - MARGIN - 2, 'بيانات الحافلة', 8, {
      color: C.onSurfaceVariant,
      right: true,
      width: 120,
    });
    ctx.y -= 13;
    draw(ctx, PAGE_W - MARGIN - 2, busName, 11, {
      bold: true,
      color: C.primary,
      right: true,
      width: 200,
    });

    // plate (top right of the same strip)
    draw(ctx, MARGIN + 2, plateLtr, 10, {
      bold: true,
      color: C.primary,
      right: false,
      width: 120,
    });
    ctx.y -= 12;
    draw(ctx, MARGIN + 2, 'رقم اللوحة', 8, {
      color: C.onSurfaceVariant,
      right: false,
      width: 120,
    });
    ctx.y -= 8;
  }

  // Identification: booking holder
  ctx.y -= 10;
  hLine(ctx, MARGIN, ctx.y, W, C.outlineVariant);
  ctx.y -= 14;
  draw(ctx, PAGE_W - MARGIN - 2, 'صاحب الحجز', 8, {
    color: C.onSurfaceVariant,
    right: true,
    width: 160,
  });
  ctx.y -= 16;
  draw(ctx, PAGE_W - MARGIN - 2, ticketData.customerName || '—', 15, {
    bold: true,
    right: true,
    width: W - 40,
  });
  ctx.y -= 14;

  // Trip timeline
  const trip = ticketData.trip;
  const dep = brief(trip);
  draw(ctx, MARGIN + 2, 'محطة المغادرة', 8, {
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, formatTime(dep.departureTime), 12, {
    bold: true,
    color: C.primary,
    right: true,
    width: 140,
  });
  ctx.y -= 18;
  draw(ctx, MARGIN + 2, dep.fromCity || '—', 15, {
    bold: true,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, 'المغادرة', 8, {
    color: C.gray,
    right: true,
    width: 140,
  });
  ctx.y -= 15;
  draw(ctx, MARGIN + 2, `${dep.fromState} ${dep.fromStation}`, 9, {
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, formatDateShort(dep.departureDate), 9, {
    color: C.tertiary,
    right: true,
    width: 140,
  });
  ctx.y -= 14;

  // arrival
  draw(ctx, MARGIN + 2, 'محطة الوصول', 8, {
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, formatTime(dep.arrivalTime), 12, {
    bold: true,
    color: C.tertiary,
    right: true,
    width: 140,
  });
  ctx.y -= 18;
  draw(ctx, MARGIN + 2, dep.toCity || '—', 15, {
    bold: true,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, 'الوصول', 8, {
    color: C.gray,
    right: true,
    width: 140,
  });
  ctx.y -= 15;
  draw(ctx, MARGIN + 2, `${dep.toState} ${dep.toStation}`, 9, {
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  draw(ctx, PAGE_W - MARGIN - 2, formatDateShort(dep.arrivalDate), 9, {
    color: C.tertiary,
    right: true,
    width: 140,
  });
  ctx.y -= 12;

  // Tear dashed line
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: MARGIN + 16, y: ctx.y },
    end: { x: PAGE_W - MARGIN - 16, y: ctx.y },
    thickness: 1.5,
    color: C.outlineVariant,
    dashArray: [3, 3],
  });
  ctx.y -= 16;

  // Passengers
  const passengers = ticketData.passengers ?? [];
  const seatNumbers = ticketData.seatNumbers ?? [];
  draw(
    ctx,
    PAGE_W - MARGIN - 2,
    `قائمة الركاب (${toAr(passengers.length)})`,
    10,
    { bold: true, color: C.onSurfaceVariant, right: true, width: 200 },
  );
  ctx.y -= 14;
  passengers.forEach((p: any, i: number) => {
    const name = p.name || '—';
    const age = p.age ?? '—';
    const gender = genderLabel(p.gender);
    const seat = seatNumbers[i] != null ? toAr(seatNumbers[i]) : '—';
    const y0 = ctx.y;
    // row card
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 26,
      width: W,
      height: 26,
      color: i % 2 === 0 ? hex('ffffff') : hex('f4fbf9'),
      borderColor: C.outlineVariant,
      borderWidth: 1,
    });
    ctx.y -= 13;
    draw(ctx, MARGIN + 12, name, 12, { bold: true, right: true, width: W / 2 });
    draw(ctx, PAGE_W - MARGIN - 12, 'رقم المقعد', 8, {
      color: C.onSurfaceVariant,
      right: true,
      width: 90,
    });
    ctx.y -= 12;
    draw(ctx, MARGIN + 12, `${gender} • ${toAr(age)} سنة`, 9, {
      color: C.onSurfaceVariant,
      right: true,
      width: W / 2,
    });
    draw(ctx, PAGE_W - MARGIN - 12, seat, 11, {
      bold: true,
      color: C.primary,
      right: true,
      width: 90,
    });
    ctx.y = y0 - 34;
  });
  ctx.y -= 4;

  // Payment summary
  const pay = ticketData.payment || {};
  const seatCount = passengers.length || 1;
  const price = Number(pay.price ?? pay.singlePrice ?? 0);
  const platformFee = Number(pay.platformFeeAmount ?? 0);
  const total = Number(pay.totalAmount ?? 0);
  const currency = pay.currency || 'جنيه سوداني';

  hLine(ctx, MARGIN, ctx.y, W, C.outlineVariant);
  ctx.y -= 14;
  draw(ctx, PAGE_W - MARGIN - 2, 'تفاصيل الدفع', 10, {
    bold: true,
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  ctx.y -= 16;
  pv(ctx, `سعر التذكرة (${toAr(seatCount)})`, formatMoney(price, currency));
  pv(ctx, 'رسوم المنصة', formatMoney(platformFee, currency));
  ctx.y -= 4;
  hLine(ctx, MARGIN, ctx.y, W, C.outlineVariant);
  ctx.y -= 12;
  // total
  draw(ctx, PAGE_W - MARGIN - 2, 'الإجمالي', 14, {
    bold: true,
    right: true,
    width: 200,
  });
  draw(ctx, MARGIN + 2, formatMoney(total, currency), 11, {
    bold: true,
    color: C.primary,
  });
  ctx.y -= 16;

  // QR + reference
  ctx.y -= 6;
  const qrBytes = ticketData.qrData
    ? await qrPngBytes(ticketData.qrData)
    : null;
  if (qrBytes) {
    try {
      const qr = await doc.embedPng(qrBytes);
      const size = 108;
      ctx.page.drawImage(qr, {
        x: PAGE_W / 2 - size / 2,
        y: ctx.y - size,
        width: size,
        height: size,
      });
      ctx.y -= size;
    } catch {
      ctx.y -= 30;
    }
  } else {
    ctx.y -= 30;
  }
  ctx.y -= 6;
  const ref = ticketData.bookingId.slice(0, 13).toUpperCase();
  drawCentered(ctx, PAGE_W / 2, ref, 9, {
    bold: true,
    color: C.onSurfaceVariant,
  });
  ctx.y -= 18;

  // Help info box
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 40,
    width: W,
    height: 40,
    color: hex('e6f2ef'),
  });
  ctx.y -= 24;
  draw(
    ctx,
    MARGIN + 14,
    'يرجى التواجد في المحطة قبل موعد المغادرة بـ ٣٠ دقيقة على الأقل. تأكد من إحضار بطاقة الهوية الوطنية أو الإقامة لمطابقة البيانات عند الصعود.',
    7.5,
    { color: C.onSecondaryContainer },
  );
  ctx.y = 0;

  return doc.save();
}

function pv(ctx: Ctx, key: string, value: string) {
  draw(ctx, PAGE_W - MARGIN - 2, key, 10, {
    color: C.onSurfaceVariant,
    right: true,
    width: 200,
  });
  draw(ctx, MARGIN + 2, value, 10, { color: C.onSurfaceVariant });
  ctx.y -= 14;
}

function brief(trip: any) {
  return {
    fromCity: trip?.fromCity,
    fromState: trip?.fromState,
    fromStation: trip?.fromStation,
    departureTime: trip?.departureTime,
    departureDate: trip?.departureDate,
    toCity: trip?.toCity,
    toState: trip?.toState,
    toStation: trip?.toStation,
    arrivalTime: trip?.arrivalTime,
    arrivalDate: trip?.arrivalDate,
  };
}

// ─────────────────────────────────────────────────────────────
// RENDER PASSENGER LIST  (A4 landscape)
// ─────────────────────────────────────────────────────────────
async function generatePassengerListBuffer(
  trip: any,
  passengerRows: any[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  (doc as any).registerFontkit(fontkit);
  const fonts = fontPaths();
  const reg = await doc.embedFont(fonts.regular);
  const bold = await doc.embedFont(fonts.bold);
  const page = doc.addPage([841.89, 595.28]); // A4 landscape
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 841.89,
    height: 595.28,
    color: rgb(1, 1, 1),
  });

  const ctx: Ctx = { doc, page, reg, bold, y: 575 };
  const ML = 40;

  draw(
    ctx,
    841.89 - ML,
    `قائمة الركاب — ${trip?.fromCity || ''} → ${trip?.toCity || ''}`,
    16,
    {
      bold: true,
      color: C.primary,
      right: true,
      width: 760,
    },
  );
  ctx.y -= 24;

  const cols = [40, 80, 80, 80, 200, 220];
  const headers = [
    '#',
    'المقعد',
    'الجنس',
    'العمر',
    'جهة الاتصال',
    'اسم الراكب',
  ];
  const cx = (i: number) => ML + cols.slice(0, i).reduce((a, b) => a + b, 0);
  const rowH = 24;

  ctx.page.drawRectangle({
    x: ML,
    y: ctx.y - rowH,
    width: 720,
    height: rowH,
    color: C.primary,
  });
  ctx.y -= 6;
  headers.forEach((h, i) => {
    draw(ctx, cx(i) + cols[i] - 6, h, 10, {
      bold: true,
      color: C.onPrimary,
      right: true,
      width: cols[i] - 12,
    });
  });
  ctx.y -= rowH - 6;

  passengerRows.forEach((p: any, i: number) => {
    const fill = i % 2 === 0 ? hex('ffffff') : hex('f4fbf9');
    ctx.page.drawRectangle({
      x: ML,
      y: ctx.y - rowH,
      width: 720,
      height: rowH,
      color: fill,
    });
    const cells = [
      toAr(i + 1),
      toAr(p.seatNumber),
      genderLabel(p.gender),
      toAr(p.age),
      p.contact,
      p.name,
    ];
    ctx.y -= 6;
    cells.forEach((val, ci) => {
      draw(ctx, cx(ci) + cols[ci] - 6, String(val ?? '—'), 10, {
        color: C.textPrimary,
        right: true,
        width: cols[ci] - 12,
      });
    });
    ctx.y -= rowH - 6;
  });

  return doc.save();
}

export { generateTicketBuffer, generatePassengerListBuffer };
