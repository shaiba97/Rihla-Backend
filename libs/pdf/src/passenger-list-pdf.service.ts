import type {
  Content,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { genderLabel, toArabicIndic } from './format.util';

/**
 * Passenger-list PDF document builder (landscape, RTL-first table).
 * Rows are supplied pre-shaped by the caller (same shape the previous
 * PDFKit implementation consumed). Uses only the three-color palette.
 */

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

export function buildPassengerListDocument(
  trip: any,
  rows: PassengerRow[],
): TDocumentDefinitions {
  const headers = [
    '#',
    'المقعد',
    'الجنس',
    'العمر',
    'جهة الاتصال',
    'اسم الراكب',
  ];

  const headerRow: TableCell[] = headers.map(
    (text): TableCell => ({
      text,
      fillColor: TAFIYA_TEAL,
      color: WHITE,
      bold: true,
      fontSize: 10,
      alignment: 'center',
    }),
  );

  const body: TableCell[][] = [headerRow];
  rows.forEach((row, index) => {
    body.push([
      { text: toArabicIndic(index + 1), fontSize: 9, alignment: 'center' },
      { text: toArabicIndic(row.seatNumber || '—'), fontSize: 9 },
      { text: genderLabel(row.gender), fontSize: 9 },
      { text: toArabicIndic(row.age), fontSize: 9 },
      { text: row.contact || '—', fontSize: 9 },
      { text: row.name || '—', fontSize: 9 },
    ]);
  });

  const tripFrom = trip?.fromCity || '—';
  const tripTo = trip?.toCity || '—';

  const content: Content[] = [
    {
      text: `قائمة الركاب — ${tripFrom} → ${tripTo}`,
      fontSize: 16,
      bold: true,
      color: TAFIYA_TEAL,
      margin: [0, 0, 0, 12],
    },
    {
      table: {
        headerRows: 1,
        widths: [30, 50, 50, 50, 150, '*'],
        body,
      },
      layout: {
        hLineWidth: (rowIndex: number, node: ContentTable) =>
          rowIndex === 0 || rowIndex === node.table.body.length
            ? 0
            : rowIndex % 2 === 0
              ? 0.5
              : 0,
        vLineWidth: () => 0,
        hLineColor: () => BLACK,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
    },
  ];

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Tajawal', fontSize: 10, color: BLACK },
    info: {
      title: `قائمة الركاب — ${tripFrom} إلى ${tripTo}`,
      author: 'تفية',
    },
    content,
  };
}
