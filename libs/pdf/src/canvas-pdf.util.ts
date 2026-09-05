/**
 * Canvas-based PDF renderer (skia-canvas 3.x).
 *
 * Draws the ticket and passenger list directly onto an A4 canvas with 2D
 * primitives and exports a native vector PDF. Text is passed as plain logical
 * Unicode; skia-canvas shapes Arabic and resolves bidi/RTL per run via
 * HarfBuzz, so no arabic-reshaper / bidi-js preprocessing is needed.
 *
 * Palette is limited to the three approved colors:
 *   #000000 (black), #FFFFFF (white), #042F2E (tafiya teal).
 */

import { Canvas, FontLibrary, Image } from 'skia-canvas';
import type { CanvasRenderingContext2D } from 'skia-canvas';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatDateShort,
  formatMoney,
  formatTime,
  genderLabel,
  toArabicIndic,
} from './format.util';
import type { TicketBusPlate, TicketData } from './ticket-pdf-data.interface';

export interface PassengerRow {
  name?: string;
  age?: number | string | null;
  gender?: string | null;
  seatNumber?: number | string | null;
  contact?: string | null;
}

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const TAFIYA_TEAL = '#042F2E';

const FONT_NAME = 'Tajawal';
const A4_W = 595.28;
const A4_H = 841.89;
const A4_LANDSCAPE_W = 841.89;
const A4_LANDSCAPE_H = 595.28;
const MARGIN_X = 36;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 34;

let fontsReady = false;

function candidateBases(): string[] {
  return [
    __dirname,
    path.join(__dirname, '..'),
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..', '..', '..'),
    process.cwd(),
  ];
}

function resolveAsset(names: string[]): string | null {
  for (const base of candidateBases()) {
    const candidate = path.join(base, ...names);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function ensureFonts(): void {
  if (fontsReady) return;
  const regular = resolveAsset(['fonts', 'Tajawal-Regular.ttf']);
  const bold = resolveAsset(['fonts', 'Tajawal-Bold.ttf']);
  if (!regular || !bold) {
    fontsReady = true;
    return;
  }
  FontLibrary.use(FONT_NAME, [regular, bold]);
  fontsReady = true;
}

function parsePlate(
  plate: string | TicketBusPlate | null | undefined,
): TicketBusPlate | string | null {
  if (plate == null) return null;
  if (typeof plate === 'string') {
    try {
      return JSON.parse(plate);
    } catch {
      return plate;
    }
  }
  return plate;
}

export function formatPlate(
  plate: string | TicketBusPlate | null | undefined,
): string {
  const parsed = parsePlate(plate);
  if (parsed == null) return '—';
  if (typeof parsed === 'string') return parsed;
  const display =
    `${parsed.numbers ?? ''} ${parsed.arabic ?? ''} ${parsed.english ?? ''}`.trim();
  return display || '—';
}

function plateParts(
  plate: string | TicketBusPlate | null | undefined,
): string[] {
  const parsed = parsePlate(plate);
  if (parsed == null) return ['—', '—', '—'];
  if (typeof parsed === 'string') return [parsed, '—', '—'];
  const part = (val: string | number | null | undefined): string =>
    val != null && val !== '' ? String(val) : '—';
  return [part(parsed.numbers), part(parsed.english), part(parsed.arabic)];
}

interface TextOpts {
  font?: string;
  color?: string;
  align?: 'left' | 'right' | 'center' | 'start';
  direction?: 'ltr' | 'rtl';
}

function drawText(
  ctx: CanvasRenderingContext2D,
  textValue: string,
  x: number,
  y: number,
  opts: TextOpts = {},
): void {
  ctx.font = opts.font ?? `13px ${FONT_NAME}`;
  ctx.fillStyle = opts.color ?? BLACK;
  ctx.textAlign = opts.align ?? 'right';
  ctx.direction = opts.direction ?? 'rtl';
  ctx.fillText(String(textValue ?? ''), x, y);
}

function drawRule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color = BLACK,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: string,
  stroke = BLACK,
  strokeWidth = 0.5,
): void {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.strokeRect(x, y, w, h);
}

function firstPage(canvas: Canvas): {
  ctx: CanvasRenderingContext2D;
  y: number;
} {
  const ctx = canvas.newPage(A4_W, A4_H);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, A4_W, A4_H);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';
  return { ctx, y: MARGIN_TOP };
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  data: TicketData,
  logoBuffer: Buffer | null | undefined,
  right: number,
): void {
  // Right: logo + brand
  const logoDrawable = logoBuffer && logoBuffer.length > 0;
  let brandRight = right;
  if (logoDrawable) {
    try {
      const img = new Image();
      img.src = logoBuffer;
      const lw = 46;
      const lh = (img.height / Math.max(img.width, 1)) * lw;
      ctx.drawImage(img, right - lw, 34, lw, lh);
      brandRight = right - lw - 10;
    } catch {
      // fall back to text-only brand
    }
  }
  drawText(ctx, 'تفية', brandRight, 36, {
    font: `bold 22px ${FONT_NAME}`,
    color: TAFIYA_TEAL,
    align: 'right',
  });
  drawText(ctx, 'TAFIYA', brandRight, 62, {
    font: `11px ${FONT_NAME}`,
    color: BLACK,
    align: 'right',
  });

  // Left: createdAt + time
  drawText(ctx, 'تاريخ الإنشاء', MARGIN_X, 34, {
    font: `10px ${FONT_NAME}`,
    align: 'left',
  });
  drawText(ctx, formatDateShort(data.createdAt), MARGIN_X, 46, {
    font: `bold 13px ${FONT_NAME}`,
    align: 'left',
  });
  drawText(ctx, 'الوقت', MARGIN_X, 62, {
    font: `10px ${FONT_NAME}`,
    align: 'left',
  });
  drawText(ctx, formatTime(data.createdAt), MARGIN_X, 74, {
    font: `bold 13px ${FONT_NAME}`,
    align: 'left',
  });
}

export async function renderTicketToPdf(
  data: TicketData,
  logoBuffer?: Buffer | null,
): Promise<Buffer> {
  ensureFonts();
  const canvas = new Canvas(A4_W, A4_H);
  let page = firstPage(canvas);
  let ctx = page.ctx;
  let y = page.y;

  const right = A4_W - MARGIN_X;
  const left = MARGIN_X;
  const pageBottom = A4_H - MARGIN_BOTTOM;

  const ensure = (h: number) => {
    if (y + h > pageBottom) {
      page = firstPage(canvas);
      ctx = page.ctx;
      y = page.y;
    }
  };

  // SECTION 1 — HEADER
  drawHeader(ctx, data, logoBuffer, right);
  y += 64;
  ensure(2);
  drawRule(ctx, left, right, y, TAFIYA_TEAL, 1.5);
  y += 18;

  // SECTION 2 — BUS DETAILS (name right / plate left)
  drawText(ctx, 'اسم الحافلة', right, y, { font: `10px ${FONT_NAME}` });
  drawText(ctx, 'رقم اللوحة', left, y, {
    font: `10px ${FONT_NAME}`,
    align: 'left',
  });
  y += 18;
  drawText(ctx, data.bus?.name || '—', right, y, {
    font: `bold 15px ${FONT_NAME}`,
  });
  const plateValues = plateParts(data.bus?.plate);
  const plateW = 160;
  const plateH = 66;
  drawBox(ctx, left, y - 4, plateW, plateH, WHITE, TAFIYA_TEAL, 1.2);
  plateValues.forEach((part, index) => {
    drawText(ctx, part, left + plateW / 2, y - 4 + 13 + index * 17, {
      font: `14px ${FONT_NAME}`,
      align: 'center',
    });
  });
  y += plateH + 12;
  ensure(2);
  drawRule(ctx, left, right, y, BLACK, 0.8);
  y += 20;

  // SECTION 3 — TRIP DETAILS (two equal centered blocks)
  const trip = data.trip ?? {};
  const contentW = right - left;
  const half = contentW / 2;
  const centerXFrom = right - half / 2;
  const centerXTo = left + half / 2;
  const tripRows: string[][] = [
    [`${trip.fromCity || '—'}`, `${trip.toCity || '—'}`],
    [`${trip.fromStation || '—'}`, `${trip.toStation || '—'}`],
    [`${trip.fromState || '—'}`, `${trip.toState || '—'}`],
    [formatTime(trip.departureTime), formatTime(trip.arrivalTime)],
    [formatDateShort(trip.departureDate), formatDateShort(trip.arrivalDate)],
  ];
  ensure(22 + tripRows.length * 24);
  drawText(ctx, 'من', centerXFrom, y, {
    font: `bold 13px ${FONT_NAME}`,
    color: TAFIYA_TEAL,
    align: 'center',
  });
  drawText(ctx, 'إلى', centerXTo, y, {
    font: `bold 13px ${FONT_NAME}`,
    color: TAFIYA_TEAL,
    align: 'center',
  });
  y += 22;
  tripRows.forEach(([fromVal, toVal], index) => {
    const font = index === 0 ? `bold 16px ${FONT_NAME}` : `12px ${FONT_NAME}`;
    drawText(ctx, fromVal, centerXFrom, y, { font, align: 'center' });
    drawText(ctx, toVal, centerXTo, y, { font, align: 'center' });
    y += 24;
  });
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(left + half, y - tripRows.length * 24 - 24);
  ctx.lineTo(left + half, y - 2);
  ctx.stroke();
  y += 10;

  // SECTION 4 — PASSENGER DETAILS
  drawText(ctx, 'بيانات الركاب', right, y, {
    font: `bold 13px ${FONT_NAME}`,
    color: TAFIYA_TEAL,
  });
  y += 18;

  const passengers = data.passengers ?? [];
  const seatNumbers = data.seatNumbers ?? [];
  const rowH = 26;
  const fixedW = 64;
  const nameW = right - left - fixedW * 3;
  const headerY = y;

  const drawPassengerRow = (cols: string[], yPos: number, header: boolean) => {
    let x = right;
    const widths = [nameW, fixedW, fixedW, fixedW];
    const cells = ['name', 'age', 'gender', 'seat'];
    for (let i = 0; i < cells.length; i++) {
      const w = widths[i];
      const cellX = x - w;
      drawBox(ctx, cellX, yPos, w, rowH, header ? TAFIYA_TEAL : undefined);
      if (header) {
        drawText(ctx, cols[i], cellX + w / 2, yPos + 5, {
          font: `bold 11px ${FONT_NAME}`,
          color: WHITE,
          align: 'center',
        });
      } else if (cells[i] === 'name') {
        drawText(ctx, cols[i], cellX + w - 8, yPos + 5, {
          font: `12px ${FONT_NAME}`,
          align: 'right',
        });
      } else {
        drawText(ctx, cols[i], cellX + w / 2, yPos + 5, {
          font: `12px ${FONT_NAME}`,
          align: 'center',
        });
      }
      x = cellX;
    }
  };

  drawPassengerRow(['الاسم', 'العمر', 'الجنس', 'المقعد'], headerY, true);
  y = headerY + rowH;
  passengers.forEach((passenger, index) => {
    ensure(rowH);
    drawPassengerRow(
      [
        passenger.name || '—',
        toArabicIndic(passenger.age),
        genderLabel(passenger.gender),
        toArabicIndic(seatNumbers[index] || '—'),
      ],
      y,
      false,
    );
    y += rowH;
  });
  y += 8;
  y += 10;

  // SECTION 5 — PAYMENT DETAILS (labels right / values start-aligned)
  drawText(ctx, 'تفاصيل الدفع', right, y, {
    font: `bold 13px ${FONT_NAME}`,
    color: TAFIYA_TEAL,
    align: 'right',
  });
  y += 20;
  const payment = data.payment ?? {};
  const price = Number(payment.price ?? 0);
  const totalAmount = Number(payment.totalAmount ?? 0);
  const currency = payment.currency ?? 'جنيه سوداني';

  const payRows: Array<[string, string]> = [
    ['طريقة الدفع', payment.paymentMethod || '—'],
    ['سعر التذكرة الواحدة', formatMoney(price, currency)],
    ['إجمالي المبلغ المدفوع', formatMoney(totalAmount, currency)],
  ];
  ctx.font = `12px ${FONT_NAME}`;
  const maxLabelW = Math.max(
    ...payRows.map(([label]) => ctx.measureText(label).width),
    120,
  );
  const valueStart = right - maxLabelW - 16;
  for (const [label, value] of payRows) {
    ensure(20);
    drawText(ctx, label, right, y, {
      font: `12px ${FONT_NAME}`,
      align: 'right',
    });
    drawText(ctx, value, valueStart, y, {
      font: `bold 12px ${FONT_NAME}`,
      align: 'right',
    });
    y += 26;
  }

  return canvas.toBuffer('pdf');
}

function newLandscapePage(canvas: Canvas): CanvasRenderingContext2D {
  const ctx = canvas.newPage(A4_LANDSCAPE_W, A4_LANDSCAPE_H);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, A4_LANDSCAPE_W, A4_LANDSCAPE_H);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';
  return ctx;
}

export async function renderPassengerListToPdf(
  trip: any,
  rows: PassengerRow[],
): Promise<Buffer> {
  ensureFonts();
  const canvas = new Canvas(A4_LANDSCAPE_W, A4_LANDSCAPE_H);
  let ctx = newLandscapePage(canvas);

  const M = 40;
  const right = A4_LANDSCAPE_W - M;
  const left = M;
  const pageBottom = A4_LANDSCAPE_H - M;
  const contentW = right - left;

  const headers = [
    '#',
    'المقعد',
    'الجنس',
    'العمر',
    'جهة الاتصال',
    'اسم الراكب',
  ];
  const widths = [44, 86, 80, 80, 180, contentW - 44 - 86 - 80 - 80 - 180];
  const rowH = 26;

  const tripFrom = trip?.fromCity || '—';
  const tripTo = trip?.toCity || '—';

  const drawHead = () => {
    drawText(ctx, `قائمة الركاب — ${tripFrom} → ${tripTo}`, right, 0, {
      font: `bold 16px ${FONT_NAME}`,
      color: TAFIYA_TEAL,
      align: 'right',
    });
    let hx = right;
    for (let i = 0; i < headers.length; i++) {
      const w = widths[i];
      const cellX = hx - w;
      drawBox(ctx, cellX, 30, w, rowH, TAFIYA_TEAL);
      drawText(ctx, headers[i], cellX + w / 2, 35, {
        font: `bold 11px ${FONT_NAME}`,
        color: WHITE,
        align: 'center',
      });
      hx = cellX;
    }
    return 30 + rowH;
  };

  let y = drawHead();
  const rowValues = (row: PassengerRow, index: number): string[] => [
    toArabicIndic(index + 1),
    toArabicIndic(row.seatNumber || '—'),
    genderLabel(row.gender),
    toArabicIndic(row.age),
    row.contact || '—',
    row.name || '—',
  ];

  rows.forEach((row, index) => {
    if (y + rowH > pageBottom) {
      ctx = newLandscapePage(canvas);
      y = drawHead();
    }
    let hx = right;
    const values = rowValues(row, index);
    for (let i = 0; i < headers.length; i++) {
      const w = widths[i];
      const cellX = hx - w;
      drawBox(ctx, cellX, y, w, rowH);
      const align = i === headers.length - 1 ? 'right' : 'center';
      drawText(ctx, values[i], cellX + w / 2, y + 6, {
        font: `11px ${FONT_NAME}`,
        align: align === 'center' ? 'center' : 'right',
      });
      hx = cellX;
    }
    y += rowH;
  });

  return canvas.toBuffer('pdf');
}
