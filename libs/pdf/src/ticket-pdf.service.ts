import type {
  Column,
  Content,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import {
  formatDateShort,
  formatMoney,
  formatTime,
  genderLabel,
  toArabicIndic,
} from './format.util';
import type { TicketData, TicketBusPlate } from './ticket-pdf-data.interface';

/**
 * Ticket PDF document builder.
 *
 * The layout mirrors the pdfmake spike sample the user visually approved:
 * RTL-first column order, three-color palette (#000000 / #FFFFFF / #042F2E),
 * and all Arabic text passed as plain logical Unicode (pdfmake shapes and
 * reorders it internally). No visual-order preprocessing is applied.
 */

export interface TicketDocumentOptions {
  logoDataUri?: string | null;
}

const BLACK = '#000000';
const TAFIYA_TEAL = '#042F2E';

const A4_WIDTH = 595.28;
const PAGE_MARGINS = [36, 32, 36, 32] as const;
const LINE_WIDTH = A4_WIDTH - PAGE_MARGINS[0] - PAGE_MARGINS[2];

interface LabelValuePair {
  label: string;
  value: string;
}

function separator(lineColor: string, vertical: number): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 2,
        x2: LINE_WIDTH,
        y2: 2,
        lineWidth: 0.6,
        lineColor,
      },
    ],
    margin: [0, vertical, 0, vertical],
  };
}

function formatPlate(
  plate: string | TicketBusPlate | null | undefined,
): string {
  if (plate == null) return '—';
  if (typeof plate === 'string') {
    try {
      const parsed: TicketBusPlate = JSON.parse(plate);
      const display =
        `${parsed.numbers ?? ''} ${parsed.arabic ?? ''} ${parsed.english ?? ''}`.trim();
      return display || '—';
    } catch {
      return plate;
    }
  }
  const display =
    `${plate.numbers ?? ''} ${plate.arabic ?? ''} ${plate.english ?? ''}`.trim();
  return display || '—';
}

function buildTripColumn(prefix: 'from' | 'to', trip: any): Column {
  const isDeparture = prefix === 'from';
  const pairs: LabelValuePair[] = isDeparture
    ? [
        { label: 'مدينة المغادرة', value: trip?.fromCity || '—' },
        { label: 'المحطة', value: trip?.fromStation || '—' },
        { label: 'الولاية', value: trip?.fromState || '—' },
        { label: 'وقت المغادرة', value: formatTime(trip?.departureTime) },
        {
          label: 'تاريخ المغادرة',
          value: formatDateShort(trip?.departureDate),
        },
      ]
    : [
        { label: 'مدينة الوصول', value: trip?.toCity || '—' },
        { label: 'المحطة', value: trip?.toStation || '—' },
        { label: 'الولاية', value: trip?.toState || '—' },
        { label: 'وقت الوصول', value: formatTime(trip?.arrivalTime) },
        { label: 'تاريخ الوصول', value: formatDateShort(trip?.arrivalDate) },
      ];
  return {
    stack: pairs.flatMap((pair) => [
      { text: pair.label, fontSize: 9 },
      { text: pair.value, bold: true },
    ]),
    width: '*',
    alignment: 'right' as const,
  };
}

function buildPassengerTable(data: TicketData): ContentTable {
  const passengers = data.passengers ?? [];
  const seatNumbers = data.seatNumbers ?? [];

  const body: TableCell[][] = [
    ['المقعد', 'النوع', 'العمر', 'الاسم'].map((text) => ({ text })),
  ];

  passengers.forEach((passenger, index) => {
    body.push([
      { text: toArabicIndic(seatNumbers[index] || '—') },
      { text: genderLabel(passenger.gender) },
      { text: toArabicIndic(passenger.age) },
      { text: passenger.name || '—' },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', 60, 60, 60],
      body,
    },
    layout: {
      hLineWidth: (rowIndex: number, node: ContentTable) =>
        rowIndex === 0 || rowIndex === node.table.body.length ? 0 : 0.4,
      vLineWidth: () => 0,
      hLineColor: () => BLACK,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

export function buildTicketDocument(
  data: TicketData,
  options: TicketDocumentOptions = {},
): TDocumentDefinitions {
  const content: Content[] = [];

  // SECTION 1 — HEADER: brand + logo (right) / creation date (left)
  const brandStack: Content[] = [];
  if (options.logoDataUri) {
    brandStack.push({ image: 'logo', width: 90, alignment: 'right' });
  }
  brandStack.push({
    text: 'تفية',
    fontSize: 20,
    bold: true,
    color: TAFIYA_TEAL,
    alignment: 'right',
  });

  content.push({
    columns: [
      {
        stack: [
          { text: 'تاريخ إنشاء التذكرة', fontSize: 9 },
          { text: formatDateShort(data.createdAt), bold: true },
        ],
        width: '*',
        alignment: 'left',
      },
      {
        stack: brandStack,
        width: '*',
        alignment: 'right',
      },
    ],
  });

  content.push(separator(TAFIYA_TEAL, 6));

  // SECTION 2 — BUS DETAILS
  content.push({
    columns: [
      {
        stack: [
          { text: 'رقم اللوحة', fontSize: 9 },
          { text: formatPlate(data.bus?.plate), bold: true, fontSize: 11 },
        ],
        width: '*',
        alignment: 'right',
      },
      {
        stack: [
          { text: 'اسم الحافلة', fontSize: 9 },
          { text: data.bus?.name || '—', bold: true, fontSize: 11 },
        ],
        width: '*',
        alignment: 'right',
      },
    ],
  });

  content.push(separator(BLACK, 6));

  // SECTION 3 — TRIP DETAILS (arrival left / departure right)
  content.push({
    columns: [
      buildTripColumn('to', data.trip),
      buildTripColumn('from', data.trip),
    ],
  });

  content.push(separator(BLACK, 6));

  // SECTION 4 — PASSENGER DETAILS
  content.push({
    text: 'بيانات الركاب',
    fontSize: 13,
    bold: true,
    color: TAFIYA_TEAL,
    margin: [0, 0, 0, 6],
  });

  content.push(buildPassengerTable(data));

  content.push(separator(BLACK, 8));

  // SECTION 5 — PAYMENT DETAILS (labels right / values left)
  const payment = data.payment ?? {};
  const price = Number(payment.price ?? 0);
  const totalAmount = Number(payment.totalAmount ?? 0);
  const currency = payment.currency ?? 'جنيه سوداني';

  content.push({
    columns: [
      {
        stack: [
          { text: formatMoney(totalAmount, currency), bold: true },
          { text: formatMoney(price, currency), bold: true },
          { text: payment.paymentMethod || '—', bold: true },
        ],
        width: '*',
        alignment: 'right' as const,
      },
      {
        stack: [
          { text: 'إجمالي المبلغ المدفوع', fontSize: 9 },
          { text: 'سعر التذكرة الواحدة', fontSize: 9 },
          { text: 'طريقة الدفع', fontSize: 9 },
        ],
        width: '*',
        alignment: 'right' as const,
        margin: [0, 4, 0, 0],
      },
    ],
  });

  const images: Record<string, string> = {};
  if (options.logoDataUri) {
    images['logo'] = options.logoDataUri;
  }

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [...PAGE_MARGINS],
    defaultStyle: { font: 'Tajawal', fontSize: 10, color: BLACK },
    images,
    info: {
      title: `تذكرة ${data.bookingId}`,
      author: 'تفية',
    },
    content,
  };
}
