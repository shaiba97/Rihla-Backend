/**
 * "Image-style" passenger list, rendered with skia-canvas and exported as a
 * vector PDF (document mode). Draws the same RTL designed layout one would
 * build for a PNG — brand header, FROM/TO + bus-plate grid, passenger table —
 * onto A4 portrait pages with pagination for long lists.
 *
 * Palette is strictly limited to the three approved colors:
 *   #000000 (black), #FFFFFF (white), #8B5E3C (tafiya brown).
 * No gradients, shadows, tints or extra colors.
 *
 * Arabic is handed to skia-canvas as plain logical Unicode; HarfBuzz shapes it
 * and bidi/RTL runs are resolved per `ctx.direction = 'rtl'`, so no
 * arabic-reshaper / bidi-js preprocessing is needed (Tajawal is registered
 * from the bundled font assets).
 */

import { Canvas, FontLibrary, Image } from 'skia-canvas';
import type { CanvasRenderingContext2D } from 'skia-canvas';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatDateShort,
  formatTime,
  genderLabel,
  toArabicIndic,
} from './format.util';

export interface PassengerListImageRow {
  name?: string | null;
  age?: number | string | null;
  gender?: string | null;
  seatNumber?: number | string | null;
  contact?: string | null;
}

export interface PassengerListImageOptions {
  logoBuffer?: Buffer | null;
  generatedAt?: Date | string | null;
}

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const BROWN = '#8B5E3C';

const FONT_NAME = 'Tajawal';
const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 40;

const HEADER_H = 30;
const ROW_H = 26;
const FOOTER_RESERVE = 40;
const TABLE_BOTTOM_LIMIT = PAGE_H - MARGIN - FOOTER_RESERVE;

const HEADERS = ['الاسم', 'العمر', 'الجنس', 'المقعد'];

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

interface TextOpts {
  font?: string;
  color?: string;
  align?: 'left' | 'right' | 'center' | 'start';
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: TextOpts = {},
): void {
  ctx.font = opts.font ?? `13px ${FONT_NAME}`;
  ctx.fillStyle = opts.color ?? BLACK;
  ctx.textAlign = opts.align ?? 'right';
  ctx.fillText(String(text ?? ''), x, y);
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; stroke?: string } = {},
): void {
  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fillRect(x, y, w, h);
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
  }
}

function plateDisplay(plate: any): string {
  if (plate == null) return '—';
  let parsed = plate;
  if (typeof plate === 'string') {
    try {
      parsed = JSON.parse(plate);
    } catch {
      return plate;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const part = (v: any): string =>
      v !== undefined && v !== null && v !== '' ? String(v) : '—';
    return [part(parsed.numbers), part(parsed.arabic), part(parsed.english)]
      .join(' ')
      .trim();
  }
  return String(parsed);
}

function newPage(canvas: Canvas): CanvasRenderingContext2D {
  const ctx = canvas.newPage(PAGE_W, PAGE_H);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';
  return ctx;
}

/**
 * Draws the designed passenger list across however many A4 portrait pages are
 * needed. Exported separately so tests / dev scripts can also export a PNG
 * preview of the first page for visual checks.
 */
export function drawPassengerListCanvas(
  trip: any,
  rows: PassengerListImageRow[],
  options: PassengerListImageOptions = {},
): Canvas {
  ensureFonts();
  const canvas = new Canvas(PAGE_W, PAGE_H);
  let ctx = newPage(canvas);

  const contentRight = PAGE_W - MARGIN;
  const contentLeft = MARGIN;
  const contentW = contentRight - contentLeft;

  // ---------------------------------------------------------------- header
  const generatedAt = options.generatedAt ?? new Date();
  let brandTextX = contentRight;
  if (options.logoBuffer && options.logoBuffer.length > 0) {
    try {
      const img = new Image();
      img.src = options.logoBuffer;
      const lw = 46;
      const lh = (img.height / Math.max(img.width, 1)) * lw;
      ctx.drawImage(img, contentRight - lw, 40, lw, lh);
      brandTextX = contentRight - lw - 10;
    } catch {
      // fall back to text-only brand
    }
  }
  drawText(ctx, 'تفية', brandTextX, 40, {
    font: `bold 22px ${FONT_NAME}`,
    color: BROWN,
    align: 'right',
  });
  drawText(ctx, 'TAFIYA', brandTextX, 66, {
    font: `11px ${FONT_NAME}`,
    color: BLACK,
    align: 'right',
  });

  drawText(ctx, 'قائمة الركاب', contentLeft, 40, {
    font: `bold 18px ${FONT_NAME}`,
    color: BROWN,
    align: 'left',
  });
  drawText(
    ctx,
    `تاريخ الإنشاء: ${formatDateShort(generatedAt)}  •  الوقت: ${formatTime(generatedAt)}`,
    contentLeft,
    66,
    { font: `11px ${FONT_NAME}`, color: BLACK, align: 'left' },
  );

  ctx.strokeStyle = BROWN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentLeft, 96);
  ctx.lineTo(contentRight, 96);
  ctx.stroke();

  // ------------------------------------------------------------------ grid
  const GRID_TOP = 112;
  const GRID_H = 108;
  const tripW = 300;
  const busW = contentW - tripW - 12;
  const tripRight = contentRight;
  const tripLeft = tripRight - tripW;
  const busRight = tripLeft - 12;
  const busLeft = contentLeft;
  const halfW = (tripW - 10) / 2;
  const fromRight = tripRight;
  const fromLeft = fromRight - halfW;
  const toRight = fromLeft - 10;
  const toLeft = tripLeft;

  // FROM box (right-most, primary in RTL order)
  drawCell(ctx, fromLeft, GRID_TOP, halfW, GRID_H, {
    fill: WHITE,
    stroke: BROWN,
  });
  drawText(ctx, 'من', fromRight - 10, GRID_TOP + 10, {
    font: `bold 13px ${FONT_NAME}`,
    color: BROWN,
  });
  const routeFrom =
    [trip?.fromState, trip?.fromCity, trip?.fromStation]
      .filter((v: any) => v != null && v !== '')
      .join(' — ') || '—';
  drawText(ctx, routeFrom, fromRight - 10, GRID_TOP + 34, {
    font: `bold 13px ${FONT_NAME}`,
  });
  drawText(
    ctx,
    `${formatDateShort(trip?.departureDate)}  ${formatTime(trip?.departureTime)}`,
    fromRight - 10,
    GRID_TOP + 62,
    { font: `11px ${FONT_NAME}` },
  );

  // TO box
  drawCell(ctx, toLeft, GRID_TOP, halfW, GRID_H, {
    fill: WHITE,
    stroke: BROWN,
  });
  drawText(ctx, 'إلى', toRight - 10, GRID_TOP + 10, {
    font: `bold 13px ${FONT_NAME}`,
    color: BROWN,
  });
  const routeTo =
    [trip?.toState, trip?.toCity, trip?.toStation]
      .filter((v: any) => v != null && v !== '')
      .join(' — ') || '—';
  drawText(ctx, routeTo, toRight - 10, GRID_TOP + 34, {
    font: `bold 13px ${FONT_NAME}`,
  });
  drawText(
    ctx,
    `${formatDateShort(trip?.arrivalDate)}  ${formatTime(trip?.arrivalTime)}`,
    toRight - 10,
    GRID_TOP + 62,
    { font: `11px ${FONT_NAME}` },
  );

  // Bus box
  drawCell(ctx, busLeft, GRID_TOP, busW, GRID_H, {
    fill: WHITE,
    stroke: BROWN,
  });
  drawText(ctx, 'الحافلة', busRight - 10, GRID_TOP + 10, {
    font: `bold 13px ${FONT_NAME}`,
    color: BROWN,
  });
  drawText(ctx, trip?.Bus?.name || '—', busRight - 10, GRID_TOP + 34, {
    font: `bold 13px ${FONT_NAME}`,
  });
  drawText(ctx, 'رقم اللوحة', busRight - 10, GRID_TOP + 58, {
    font: `11px ${FONT_NAME}`,
    color: BROWN,
  });
  drawText(ctx, plateDisplay(trip?.Bus?.plate), busRight - 10, GRID_TOP + 76, {
    font: `12px ${FONT_NAME}`,
  });
  drawText(
    ctx,
    `المقاعد: ${toArabicIndic(trip?.Bus?.chairs)}`,
    busRight - 10,
    GRID_TOP + 100,
    { font: `12px ${FONT_NAME}` },
  );

  // ---------------------------------------------------------------- table
  drawText(ctx, 'الركاب', contentRight, GRID_TOP + GRID_H + 12, {
    font: `bold 14px ${FONT_NAME}`,
    color: BROWN,
  });

  const tableTop = GRID_TOP + GRID_H + 26;
  const colWidths = [contentW - 80 - 90 - 70, 80, 90, 70];

  const drawHead = (): number => {
    let hx = contentRight;
    for (let i = 0; i < HEADERS.length; i++) {
      const w = colWidths[i];
      const cellX = hx - w;
      drawCell(ctx, cellX, tableTop, w, HEADER_H, { fill: BROWN });
      drawText(ctx, HEADERS[i], cellX + w / 2, tableTop + 8, {
        font: `bold 13px ${FONT_NAME}`,
        color: WHITE,
        align: 'center',
      });
      hx = cellX;
    }
    return tableTop + HEADER_H;
  };

  let y = drawHead();

  if (rows.length === 0) {
    drawCell(ctx, contentLeft, y, contentW, ROW_H, { stroke: BROWN });
    drawText(ctx, 'لا يوجد ركاب مؤكدين', contentRight - contentW / 2, y + 6, {
      font: `13px ${FONT_NAME}`,
      align: 'center',
    });
    y += ROW_H;
  } else {
    rows.forEach((row) => {
      if (y + ROW_H > TABLE_BOTTOM_LIMIT) {
        ctx = newPage(canvas);
        y = drawHead();
      }
      let hx = contentRight;
      const values = [
        row.name || '—',
        toArabicIndic(row.age),
        genderLabel(row.gender),
        toArabicIndic(row.seatNumber),
      ];
      for (let i = 0; i < HEADERS.length; i++) {
        const w = colWidths[i];
        const cellX = hx - w;
        drawCell(ctx, cellX, y, w, ROW_H, { stroke: BROWN });
        if (i === 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(cellX, y, w, ROW_H);
          ctx.clip();
          drawText(ctx, values[i], hx - 6, y + 6, {
            font: `13px ${FONT_NAME}`,
            align: 'right',
          });
          ctx.restore();
        } else {
          drawText(ctx, values[i], cellX + w / 2, y + 6, {
            font: `13px ${FONT_NAME}`,
            align: 'center',
          });
        }
        hx = cellX;
      }
      y += ROW_H;
    });
  }

  // ----------------------------------------------------------------- footer
  const fY = y + 14;
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(contentLeft, fY);
  ctx.lineTo(contentRight, fY);
  ctx.stroke();
  drawText(
    ctx,
    `إجمالي الركاب: ${toArabicIndic(rows.length)}`,
    contentRight,
    fY + 6,
    {
      font: `bold 14px ${FONT_NAME}`,
      color: BROWN,
    },
  );
  drawText(ctx, 'تفية — TAFIYA', contentLeft, fY + 8, {
    font: `10px ${FONT_NAME}`,
    color: BLACK,
    align: 'left',
  });

  return canvas;
}

export async function renderPassengerListCanvasPdf(
  trip: any,
  rows: PassengerListImageRow[],
  options: PassengerListImageOptions = {},
): Promise<Buffer> {
  const canvas = drawPassengerListCanvas(trip, rows, options);
  return canvas.toBuffer('pdf');
}
