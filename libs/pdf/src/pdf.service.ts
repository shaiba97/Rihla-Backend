import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '@app/prisma';

import pdfMake from 'pdfmake';

interface TFontDictionary {
  [key: string]: {
    normal: string;
    bold: string;
  };
}

@Injectable()
export class PDFService {

  private readonly logger = new Logger(PDFService.name);
  private outputDir = './upload';
  constructor(private readonly prisma: PrismaService) {
    const fontsDir = path.resolve(process.cwd(), 'fonts');
    const fonts: TFontDictionary = {
      Tajawal: {
        normal: path.join(fontsDir, 'Tajawal-Regular.ttf'),
        bold: path.join(fontsDir, 'Tajawal-Bold.ttf'),
      },
    };
    pdfMake.fonts = fonts;
  }

  async generateTicket(
    bookingId: string,
    paymentData?: any,
  ): Promise<{ publicUrl: string; filePath: string; buffer: Buffer | null }> {
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
      const trip = payment.Booking.Trip;
      const bus = trip?.Bus;
      const seatNumbers = (payment.Booking.seatNumbers ?? []) as number[];
      const passengers = (payment.Booking.passenger ?? []) as any[];

      const passengerData = passengers.map((p: any, i: number) => ({
        name: p.name || '',
        age: p.age || 0,
        gender: p.gender || 'MALE',
        seatNumber: seatNumbers[i] || i + 1,
      }));

      const ticketData: any = {
        bookingId,
        bus: bus
          ? { name: bus.name, plateNumbers: bus.plate, chairs: bus.chairs }
          : undefined,
        trip: trip
          ? {
              departureDate: trip.departureDate,
              departureTime: trip.departureTime,
              arrivalDate: trip.arrivalDate,
              arrivalTime: trip.arrivalTime,
              fromState: trip.fromState,
              fromCity: trip.fromCity,
              fromStation: trip.fromStation,
              toState: trip.toState,
              toCity: trip.toCity,
              toStation: trip.toStation,
              price: trip.price,
              status: trip.status,
            }
          : undefined,
        passengers: passengerData,
        payment: {
          platformFeeAmount: payment.platformFeeAmount ?? 0,
          companyAmount: payment.companyAmount ?? 0,
          totalAmount: payment.totalAmount ?? 0,
        },
      };

      const buf = await generateTicketBuffer(ticketData);
      buffer = buf;
      fs.writeFileSync(outputPath, buf);
      this.logger.log(`Ticket saved -> ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`);
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
      const logoBase64 = loadLogoBase64();

      const passengerRows = bookings.flatMap((b: any) => {
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

      const header = [
        { text: '#', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'المقعد', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'الجنس', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'العمر', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'جهة الاتصال', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: 'اسم الراكب', font: 'Tajawal', bold: true, fontSize: 9, color: C.white, fillColor: C.primary, alignment: 'right', margin: [0, 4, 4, 4] },
      ];

      const rows = passengerRows.map((p: any, i: number) => {
        const isEven = i % 2 === 0;
        const fill = isEven ? C.bgCard : C.bgBase;
        const cell = (txt: string, align = 'center') => ({
          text: String(txt ?? '—'),
          font: 'Tajawal' as any,
          fontSize: 9,
          color: C.textPrimary,
          fillColor: fill,
          alignment: align as any,
          margin: [0, 4, 0, 4],
        });
        return [
          cell(toAr(i + 1)),
          { ...cell(toAr(p.seatNumber)), bold: true, color: C.primary },
          cell(genderLabel(p.gender)),
          cell(toAr(p.age)),
          cell(p.contact),
          { ...cell(p.name, 'right'), bold: true, margin: [0, 4, 4, 4] },
        ];
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [24, 24, 24, 24],
        defaultStyle: {
          font: 'Tajawal',
          fontSize: 10,
          color: C.textPrimary,
          alignment: 'right',
        },
        background: (currentPage: any, pageSize: any) => ({
          canvas: [{
            type: 'rect', x: 0, y: 0,
            w: pageSize.width, h: pageSize.height,
            color: C.bgBase,
          }],
        }),
        content: [
          buildHeader(logoBase64),
          {
            text: `قائمة الركاب — ${trip.fromCity || ''} → ${trip.toCity || ''}`,
            font: 'Tajawal', bold: true, fontSize: 14,
            color: C.textPrimary, alignment: 'right',
            margin: [0, 0, 0, 12],
          },
          {
            table: {
              widths: [20, 40, 40, 36, '*', '*'],
              headerRows: 1,
              body: [header, ...rows],
            },
            layout: {
              hLineWidth: (i: number) => i <= 1 ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => C.border,
              vLineColor: () => C.border,
              paddingTop: () => 0,
              paddingBottom: () => 0,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
          },
          buildFooter(trip.id),
        ],
      };

      const pdfDoc = pdfMake.createPdf(docDefinition as any);
      const buf = await pdfDoc.getBuffer();
      fs.writeFileSync(outputPath, buf);
      this.logger.log(`Passenger list saved -> ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (error: any) {
      const errStack = error?.stack || error?.message || String(error);
      this.logger.error(`فشل في إنشاء ملف PDF لقائمة الركاب ${trip.id}`, errStack);
      fs.writeFileSync(outputPath, 'PDF placeholder');
    }

    return { publicUrl, filePath: outputPath };
  }
}

/**
 * Tafiya (تفية) — Ticket Generator
 * pdfMake | Arabic RTL | Tajawal Font
 *
 * Usage (NestJS / Node.js):
 *   const { generateTicketBuffer } = require('./generateTicket');
 *   const buf = await generateTicketBuffer({ bus, trip, passengers, payment, bookingId });
 *   res.set({ 'Content-Type': 'application/pdf', ... });
 *   res.send(buf);
 */

// 'use strict';

// const pdfMake = require('pdfmake/build/pdfmake');
// const fs      = require('fs');
// const path    = require('path');

// ─────────────────────────────────────────────────────────────
// COLORS  (matches CSS variables)
// ─────────────────────────────────────────────────────────────
const C = {
  primary:      '#0D9488',
  textPrimary:  '#134E4A',
  primaryHover: '#0F766E',
  primaryLight: '#CCFBF1',
  primaryMuted: '#5EEAD4',
  bgBase:       '#F0FDFA',
  bgCard:       '#FFFFFF',
  border:       '#99F6E4',
  white:        '#FFFFFF',
  gray:         '#6B7280',
  lightGray:    '#F3F4F6',
  darkText:     '#1F2937',
  danger:       '#DC2626',
  warning:      '#D97706',
  success:      '#059669',
};

// ─────────────────────────────────────────────────────────────
// FONT LOADER  — loads from /backend/fonts OR local fallback
// ─────────────────────────────────────────────────────────────
function loadFontsVfs() {
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
      return {
        'Tajawal-Regular.ttf': fs.readFileSync(r).toString('base64'),
        'Tajawal-Bold.ttf':    fs.readFileSync(b).toString('base64'),
      };
    }
  }
  throw new Error('Tajawal fonts not found. Put them in /backend/fonts/');
}

function loadLogoBase64() {
  const cwd = process.cwd();
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'assets', 'companyLogo.png'),
    path.join(__dirname, '..', 'assets', 'companyLogo.png'),
    path.join(__dirname, 'assets', 'companyLogo.png'),
    path.join(cwd, 'assets', 'companyLogo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// ARABIC FORMATTERS
// ─────────────────────────────────────────────────────────────
function toAr(n: any) {
  return String(n ?? '').replace(/[0-9]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

/** "2026-01-15" → "الخميس، ١٥ يناير ٢٠٢٦" */
function formatDate(val: any) {
  if (!val) return '—';
  const d = (val instanceof Date) ? val : new Date(val);
  if (isNaN(d as any)) return String(val);

  const weekDays = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const months   = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const wd  = weekDays[d.getDay()];
  const day = toAr(d.getDate());
  const mon = months[d.getMonth()];
  const yr  = toAr(d.getFullYear());

  return `${wd}، ${day} ${mon} ${yr}`;
}

/** "07:30" or Date → "٠٧:٣٠ ص" */
function formatTime(val: any) {
  if (!val) return '—';
  let h, m;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
    [h, m] = val.split(':').map(Number);
  } else {
    const d = (val instanceof Date) ? val : new Date(val);
    h = d.getHours();
    m = d.getMinutes();
  }
  const period = h < 12 ? 'ص' : 'م';
  const h12    = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${toAr(String(h12).padStart(2,'0'))}:${toAr(String(m).padStart(2,'0'))} ${period}`;
}

/** 2500 → "٢٬٥٠٠ جنيه" */
function formatPrice(amount: any, currency = 'جنيه') {
  if (amount == null || amount === '') return '—';
  const n  = Number(amount);
  const formatted = n.toLocaleString('en');
  return `${toAr(formatted)} ${currency}`;
}

function genderLabel(g: any) {
  const map: Record<string, string> = { MALE:'ذكر', FEMALE:'أنثى', male:'ذكر', female:'أنثى', M:'ذكر', F:'أنثى' };
  return map[g] || g || '—';
}

function statusLabel(s: any) {
  const map: Record<string, string> = {
    ACTIVE:'نشطة', COMPLETED:'مكتملة', CANCELLED:'ملغاة',
    PENDING:'معلقة', CONFIRMED:'مؤكدة', DELAYED:'متأخرة',
  };
  return map[s] || s || '—';
}

function statusColor(s: any) {
  const map: Record<string, string> = {
    ACTIVE: C.primary, CONFIRMED: C.primary, COMPLETED: C.success,
    CANCELLED: C.danger, PENDING: C.warning, DELAYED: C.warning,
  };
  return map[s] || C.gray;
}

// ─────────────────────────────────────────────────────────────
// LAYOUT HELPERS
// ─────────────────────────────────────────────────────────────

const MARGIN = { page: [36, 36, 36, 36] };

/** Horizontal teal rule */
function rule(mt = 8, mb = 8) {
  return {
    canvas: [{ type:'line', x1:0, y1:0, x2:523, y2:0, lineWidth:0.8, lineColor: C.border }],
    margin: [0, mt, 0, mb],
  };
}

/** Section title with left accent bar */
function sectionTitle(label: any) {
  return {
    columns: [
      { text:'', width: 4 },
      {
        canvas: [{ type:'rect', x:0, y:0, w:4, h:18, r:2, color: C.primary }],
        width: 8, margin:[0,1,0,0],
      },
      {
        text:      label,
        font:      'Tajawal',
        bold:      true,
        fontSize:  11,
        color:     C.textPrimary,
        alignment: 'right',
      },
    ],
    columnGap: 4,
    margin:    [0, 0, 0, 6],
  };
}

/** Card with light-teal bg and border */
function card(stack: any, mbottom = 10) {
  return {
    table: {
      widths: ['*'],
      body:   [[{ stack, margin:[14,10,14,10] }]],
    },
    layout: {
      hLineWidth: () => 1, vLineWidth: () => 1,
      hLineColor: () => C.border, vLineColor: () => C.border,
      fillColor:  () => C.bgCard,
    },
    margin: [0, 0, 0, mbottom],
  };
}

/** Key / Value row — RTL: value right, key label left */
function kv(keyLabel: any, value: any, opts: any = {}) {
  return {
    columns: [
      {
        text:      String(value ?? '—'),
        font:      'Tajawal',
        bold:      opts.bold    ?? false,
        fontSize:  opts.size    ?? 10,
        color:     opts.color   ?? C.textPrimary,
        alignment: 'right',
        width:     '*',
      },
      {
        text:      keyLabel,
        font:      'Tajawal',
        bold:      true,
        fontSize:  opts.size ?? 10,
        color:     C.gray,
        alignment: 'right',
        width:     opts.kw ?? 115,
      },
    ],
    margin: [0, 2, 0, 2],
  };
}

/** Status badge pill */
function badge(text: any, bgColor: any) {
  return {
    table: {
      widths: ['auto'],
      body: [[{
        text,
        font: 'Tajawal', bold: true, fontSize: 8.5,
        color: C.white, fillColor: bgColor,
        margin: [10, 3, 10, 3], alignment: 'center',
      }]],
    },
    layout: {
      hLineWidth: ()=>0, vLineWidth: ()=>0,
      fillColor: ()=> bgColor,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION BUILDERS
// ─────────────────────────────────────────────────────────────

function buildHeader(logoBase64: any) {
  const logoCol = logoBase64
    ? { image: logoBase64, width: 52, height: 52, margin:[0,0,0,0] }
    : { canvas:[{type:'ellipse', x:26, y:26, r1:26, r2:26, color: C.primaryLight}], width:52 };

  return {
    stack: [
      // Teal top accent bar (full width)
      {
        canvas: [{
          type: 'rect', x:-36, y:-36, w:600, h:6, color: C.primary,
        }],
        margin: [0,0,0,0],
      },
      // Header row
      {
        columns: [
          // RIGHT: Logo + brand name
          {
            columns: [
              {
                stack: [
                  {
                    text:      'تفية',
                    font:      'Tajawal',
                    bold:      true,
                    fontSize:  30,
                    color:     C.primary,
                    alignment: 'right',
                  },
                  {
                    text:      'تذكرة سفر رسمية',
                    font:      'Tajawal',
                    fontSize:  9.5,
                    color:     C.gray,
                    alignment: 'right',
                    margin:    [0, 1, 0, 0],
                  },
                ],
                width: '*',
                alignment: 'right',
              },
              { ...logoCol, width: 52, alignment:'left', margin:[0,0,0,0] },
            ],
            columnGap: 10,
            width: '*',
          },
        ],
        margin: [0, 10, 0, 8],
      },
      // Teal divider under header
      {
        canvas: [{
          type:'rect', x:-36, y:0, w:600, h:3, color: C.primaryLight,
        }],
        margin: [0,0,0,12],
      },
    ],
  };
}

function buildBusSection(bus: any) {
  if (!bus) return { text:'' };
  const plate  = bus.plateNumbers || bus.plate || {};
  const nums   = toAr(plate.numbers  || '');
  const arabic = plate.arabic  || '';
  const eng    = plate.english || '';
  const plateParts = [nums, arabic, eng].filter(Boolean).join('  |  ');

  return card([
    sectionTitle('معلومات الحافلة'),
    {
      columns: [
        kv('اسم الحافلة', bus.name || '—'),
        kv('عدد المقاعد', bus.chairs ? toAr(bus.chairs) + ' مقعداً' : '—'),
      ],
      columnGap: 12,
    },
    kv('لوحة الترقيم', plateParts || '—'),
  ]);
}

function buildTripSection(trip: any) {
  if (!trip) return { text:'' };

  const statusBg = statusColor(trip.status);
  const statusTx = statusLabel(trip.status);

  return card([
    // Title row + status badge
    {
      columns: [
        {
          stack: [sectionTitle('تفاصيل الرحلة')],
          width: '*',
        },
        {
          ...badge(statusTx, statusBg),
          alignment: 'left',
          width: 'auto',
          margin: [0,0,0,6],
        },
      ],
    },

    // ── ROUTE VISUAL ─────────────────────────────
    {
      table: {
        widths: ['*', 60, '*'],
        body: [[
          // RIGHT column — Departure
          {
            stack: [
              {
                canvas: [{
                  type:'rect', x:0, y:0, w:130, h:72, r:8,
                  color: C.bgBase,
                }],
                margin:[0,0,0,0],
              },
              { text: trip.fromCity    || '—',     font:'Tajawal', bold:true,  fontSize:15, color:C.textPrimary, alignment:'center', margin:[0,-68,0,0] },
              { text: trip.fromState   || '',       font:'Tajawal', fontSize:8.5, color:C.gray, alignment:'center' },
              { text: trip.fromStation || '',       font:'Tajawal', fontSize:8,   color:C.gray, alignment:'center', margin:[4,1,4,0] },
              { text: formatDate(trip.departureDate), font:'Tajawal', bold:true, fontSize:9.5, color:C.primary, alignment:'center', margin:[0,5,0,0] },
              { text: formatTime(trip.departureTime), font:'Tajawal', bold:true, fontSize:13,  color:C.textPrimary, alignment:'center' },
              {
                text: 'المغادرة',
                font:'Tajawal', fontSize:7.5, color:C.gray, alignment:'center',
              },
            ],
            border:[false,false,false,false],
            margin:[0,0,0,0],
          },

          // CENTER — Arrow
          {
            stack: [
              { text:'', margin:[0,10,0,0] },
              {
                canvas: [
                  { type:'line', x1:5,  y1:36, x2:50, y2:36, lineWidth:1.5, lineColor:C.primaryMuted },
                  { type:'polyline', points:[{x:5,y:31},{x:5,y:41},{x:0,y:36}], lineWidth:0, color:C.primaryMuted },
                ],
                margin:[0,0,0,0],
              },
              {
                text: '◄',
                font:'Tajawal', fontSize:8, color:C.primaryMuted,
                alignment:'center', margin:[0,-14,0,0],
              },
            ],
            border:[false,false,false,false],
            alignment:'center',
          },

          // LEFT column — Arrival
          {
            stack: [
              {
                canvas: [{
                  type:'rect', x:0, y:0, w:130, h:72, r:8,
                  color: C.bgBase,
                }],
                margin:[0,0,0,0],
              },
              { text: trip.toCity    || '—',     font:'Tajawal', bold:true,  fontSize:15, color:C.textPrimary, alignment:'center', margin:[0,-68,0,0] },
              { text: trip.toState   || '',       font:'Tajawal', fontSize:8.5, color:C.gray, alignment:'center' },
              { text: trip.toStation || '',       font:'Tajawal', fontSize:8,   color:C.gray, alignment:'center', margin:[4,1,4,0] },
              { text: formatDate(trip.arrivalDate),   font:'Tajawal', bold:true, fontSize:9.5, color:C.primary, alignment:'center', margin:[0,5,0,0] },
              { text: formatTime(trip.arrivalTime),   font:'Tajawal', bold:true, fontSize:13,  color:C.textPrimary, alignment:'center' },
              {
                text: 'الوصول',
                font:'Tajawal', fontSize:7.5, color:C.gray, alignment:'center',
              },
            ],
            border:[false,false,false,false],
            margin:[0,0,0,0],
          },
        ]],
      },
      layout: { hLineWidth:()=>0, vLineWidth:()=>0 },
      margin: [0, 0, 0, 10],
    },

    rule(4, 8),
    kv('سعر التذكرة الواحدة', formatPrice(trip.price), { bold:true, color:C.primary }),
  ]);
}

function buildPassengersSection(passengers: any) {
  if (!passengers || !passengers.length) return { text:'' };

  const header = [
    { text:'#',      font:'Tajawal', bold:true, fontSize:9, color:C.white, fillColor:C.primary, alignment:'center', margin:[0,4,0,4] },
    { text:'المقعد', font:'Tajawal', bold:true, fontSize:9, color:C.white, fillColor:C.primary, alignment:'center', margin:[0,4,0,4] },
    { text:'الجنس',  font:'Tajawal', bold:true, fontSize:9, color:C.white, fillColor:C.primary, alignment:'center', margin:[0,4,0,4] },
    { text:'العمر',  font:'Tajawal', bold:true, fontSize:9, color:C.white, fillColor:C.primary, alignment:'center', margin:[0,4,0,4] },
    { text:'اسم الراكب', font:'Tajawal', bold:true, fontSize:9, color:C.white, fillColor:C.primary, alignment:'right',  margin:[0,4,4,4] },
  ];

  const rows = passengers.map((p: any, i: number) => {
    const isEven = i % 2 === 0;
    const fill   = isEven ? C.bgCard : C.bgBase;
    const cell   = (txt: any, align = 'center') => ({
      text: String(txt ?? '—'), font:'Tajawal', fontSize:9,
      color:C.textPrimary, fillColor:fill,
      alignment: align, margin:[0,4,0,4],
    });
    return [
      cell(toAr(i + 1)),
      { ...cell(toAr(p.seatNumber ?? '—')), bold:true, color:C.primary },
      cell(genderLabel(p.gender)),
      cell(toAr(p.age ?? '—')),
      { ...cell(p.name || '—', 'right'), bold:true, margin:[0,4,4,4] },
    ];
  });

  return card([
    sectionTitle(`بيانات الركاب  (${toAr(passengers.length)} راكب)`),
    {
      table: {
        widths: [20, 44, 46, 38, '*'],
        headerRows: 1,
        body: [header, ...rows],
      },
      layout: {
        hLineWidth: (i: number)  => i <= 1 ? 1 : 0.5,
        vLineWidth: ()   => 0.5,
        hLineColor: ()   => C.border,
        vLineColor: ()   => C.border,
        paddingTop:    () => 0,
        paddingBottom: () => 0,
        paddingLeft:   () => 4,
        paddingRight:  () => 4,
      },
    },
  ]);
}

function buildPaymentSection(payment: any, trip: any) {
  if (!payment) return { text:'' };

  const singlePrice = trip?.price ?? 0;
  const platformFee = payment.platformFeeAmount ?? payment.platformFee ?? 0;
  const companyAmt  = payment.companyAmount ?? 0;
  const total       = payment.totalAmount   ?? 0;

  return card([
    sectionTitle('تفاصيل الدفع'),
    kv('سعر التذكرة الواحدة',  formatPrice(singlePrice)),
    kv('رسوم المنصة',           formatPrice(platformFee)),
    rule(4, 4),
    kv('المحول للشركة',         formatPrice(companyAmt)),
    rule(4, 4),
    {
      columns: [
        {
          text:      formatPrice(total),
          font:      'Tajawal',
          bold:      true,
          fontSize:  14,
          color:     C.primary,
          alignment: 'right',
        },
        {
          text:      'الإجمالي المدفوع',
          font:      'Tajawal',
          bold:      true,
          fontSize:  11,
          color:     C.textPrimary,
          alignment: 'right',
          width:     115,
        },
      ],
      margin: [0, 4, 0, 2],
    },
  ]);
}

function buildFooter(bookingId: any) {
  return {
    stack: [
      rule(6, 6),
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            {
              text: bookingId
                ? `رقم الحجز: ${bookingId}`
                : '',
              font:'Tajawal', fontSize:8, color:C.gray, alignment:'right',
              border:[false,false,false,false],
            },
            {
              text: 'تفية — منصة حجز التذاكر',
              font:'Tajawal', fontSize:8, color:C.primary, alignment:'left',
              border:[false,false,false,false],
            },
          ]],
        },
        layout: 'noBorders',
      },
      {
        text: 'هذه التذكرة وثيقة رسمية. يُرجى الاحتفاظ بها طوال رحلتك.',
        font:'Tajawal', fontSize:7.5, color:C.gray, alignment:'center', margin:[0,3,0,0],
      },
      // Bottom teal stripe
      {
        canvas: [{ type:'rect', x:-36, y:6, w:600, h:4, color:C.primaryLight }],
        margin: [0,4,0,0],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * @param {{ bus, trip, passengers, payment, bookingId }} ticketData
 * @returns {Promise<Buffer>}  PDF as a Node.js Buffer
 */
async function generateTicketBuffer(ticketData: any) {
  const { bus, trip, passengers, payment, bookingId } = ticketData;

  // Fonts are already set by the PDFService constructor using absolute file paths
  const logoBase64 = loadLogoBase64();

  const docDefinition = {
    pageSize:        'A4',
    pageOrientation: 'portrait',
    pageMargins:     MARGIN.page,

    defaultStyle: {
      font:      'Tajawal',
      fontSize:  10,
      color:     C.textPrimary,
      alignment: 'right',
    },

    // Light teal page background
    background: (currentPage: any, pageSize: any) => ({
      canvas: [{
        type:'rect', x:0, y:0,
        w: pageSize.width, h: pageSize.height,
        color: C.bgBase,
      }],
    }),

    content: [
      buildHeader(logoBase64),
      buildBusSection(bus),
      buildTripSection(trip),
      buildPassengersSection(passengers),
      buildPaymentSection(payment, trip),
      buildFooter(bookingId),
    ],
  };

  const pdfDoc = pdfMake.createPdf(docDefinition as any);
  return pdfDoc.getBuffer();
}

module.exports.generateTicketBuffer = generateTicketBuffer;

// ─────────────────────────────────────────────────────────────
// DEMO — node generateTicket.js
// ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const sampleData = {
    bookingId: 'BK-20260115-00142',

    bus: {
      name:         'سوبر جيت — خط الخرطوم',
      plateNumbers: { numbers: '٣٦٧٢١', arabic: 'أ ب ت', english: 'KRT' },
      chairs:       44,
    },

    trip: {
      departureDate:  '2026-01-15',
      departureTime:  '07:30',
      arrivalDate:    '2026-01-15',
      arrivalTime:    '13:45',
      fromState:      'ولاية الخرطوم',
      fromCity:       'الخرطوم',
      fromStation:    'محطة الشهداء المركزية',
      toState:        'ولاية البحر الأحمر',
      toCity:         'بورتسودان',
      toStation:      'محطة بورتسودان الرئيسية',
      price:          2500,
      status:         'CONFIRMED',
    },

    passengers: [
      { name: 'أحمد محمد علي',    age: 32, gender: 'MALE',   seatNumber: 12 },
      { name: 'فاطمة أحمد حسن',   age: 28, gender: 'FEMALE', seatNumber: 13 },
      { name: 'محمد عبدالله خالد', age: 8,  gender: 'MALE',   seatNumber: 14 },
    ],

    payment: {
      platformFeeAmount: 150,
      companyAmount:     7350,
      totalAmount:       7500,
    },
  };

  generateTicketBuffer(sampleData).then(buf => {
    const outPath = path.join(__dirname, 'tafiya-ticket.pdf');
    fs.writeFileSync(outPath, buf);
    console.log('✅  Ticket saved →', outPath, `(${(buf.length/1024).toFixed(1)} KB)`);
  }).catch((e: any) => {
    console.error('❌  Error:', e.message);
    process.exit(1);
  });
}

