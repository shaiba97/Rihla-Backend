import { describe, it, expect } from '@jest/globals';
import { buildTicketDocument } from './ticket-pdf.service';
import type { TicketData } from './ticket-pdf-data.interface';

const PALETTE = new Set(['#000000', '#FFFFFF', '#042F2E']);

function sampleTicket(): TicketData {
  return {
    bookingId: 'B-1',
    createdAt: new Date(2026, 8, 5, 8, 0),
    bus: {
      name: 'عنداء للسفر',
      plate: { numbers: 1234, arabic: 'س ع', english: 'ab' },
    },
    trip: {
      fromCity: 'الخرطوم',
      fromStation: 'المحطة المركزية',
      fromState: 'الخرطوم',
      departureTime: '08:00',
      departureDate: new Date(2026, 8, 5),
      toCity: 'بورتسودان',
      toStation: 'محطة بورتسودان',
      toState: 'البحر الأحمر',
      arrivalTime: '14:00',
      arrivalDate: new Date(2026, 8, 5),
    },
    passengers: [
      { name: 'أحمد محمد علي', age: 32, gender: 'MALE' },
      { name: 'خالد Hassan', age: 25, gender: 'M' },
    ],
    seatNumbers: [12, 14],
    payment: {
      price: 250,
      totalAmount: 500,
      currency: 'جنيه سوداني',
      paymentMethod: 'أونلاين',
    },
  };
}

function collectContent(node: any, out: any[] = []): any[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectContent(item, out);
    return out;
  }
  out.push(node);
  for (const key of ['content', 'columns', 'stack', 'ul', 'ol', 'table']) {
    if (node[key]) collectContent(node[key], out);
  }
  if (node.table && node.table.body) {
    for (const row of node.table.body) collectContent(row, out);
  }
  return out;
}

function collectTexts(doc: any): string[] {
  const out: string[] = [];
  for (const node of collectContent(doc.content)) {
    if (typeof node.text === 'string') out.push(node.text);
  }
  return out;
}

function collectColors(doc: any): string[] {
  const out: string[] = [];
  const scan = (obj: any) => {
    if (obj == null || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(scan);
      return;
    }
    for (const key of [
      'color',
      'fillColor',
      'lineColor',
      'foreground',
      'background',
    ]) {
      if (typeof obj[key] === 'string') out.push(obj[key]);
    }
    for (const key of Object.keys(obj)) {
      if (key === 'canvas') continue;
      scan(obj[key]);
    }
  };
  scan(doc);
  return out;
}

function firstStackOf(columnsNode: any): any {
  return columnsNode.columns[0].stack;
}

describe('buildTicketDocument', () => {
  it('renders all sections in the expected order', () => {
    const doc = buildTicketDocument(sampleTicket());
    const texts = collectTexts(doc);
    const expectedOrder = [
      'تاريخ إنشاء التذكرة',
      'رقم اللوحة',
      'اسم الحافلة',
      'مدينة الوصول',
      'مدينة المغادرة',
      'بيانات الركاب',
      'إجمالي المبلغ المدفوع',
      'سعر التذكرة الواحدة',
      'طريقة الدفع',
    ];
    let lastIndex = -1;
    for (const label of expectedOrder) {
      const idx = texts.indexOf(label);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it('uses only the three-design-token colors', () => {
    const doc = buildTicketDocument(sampleTicket());
    for (const color of collectColors(doc)) {
      expect(PALETTE.has(color)).toBe(true);
    }
  });

  it('lays out RTL-first: brand right, created date left', () => {
    const doc = buildTicketDocument(sampleTicket());
    const header = doc.content[0];
    const rightStackTexts = collectTexts({ content: firstStackOf(header) });
    const leftStackTexts = collectTexts({ content: header.columns[1].stack });
    expect(rightStackTexts).toEqual([
      'تاريخ إنشاء التذكرة',
      expect.any(String),
    ]);
    expect(leftStackTexts).toContain('تفية');
  });

  it('puts bus name in the right column and plate in the left column', () => {
    const doc = buildTicketDocument(sampleTicket());
    const bus = doc.content[2];
    expect(collectTexts({ content: firstStackOf(bus) })).toContain(
      '1234 س ع ab',
    );
    expect(collectTexts({ content: bus.columns[1].stack })).toContain(
      'عنداء للسفر',
    );
  });

  it('puts departure on the right of the trip block and arrival on the left', () => {
    const doc = buildTicketDocument(sampleTicket());
    const trip = doc.content[4];
    const leftTexts = collectTexts({ content: firstStackOf(trip) });
    const rightTexts = collectTexts({ content: trip.columns[1].stack });
    expect(leftTexts).toContain('مدينة الوصول');
    expect(leftTexts).toContain('بورتسودان');
    expect(rightTexts).toContain('مدينة المغادرة');
    expect(rightTexts).toContain('الخرطوم');
  });

  it('formats values with Arabic-Indic digits', () => {
    const doc = buildTicketDocument(sampleTicket());
    const texts = collectTexts(doc);
    expect(texts).toContain('٠٨:٠٠ ص');
    expect(texts).toContain('٢٥٠٫٠٠ جنيه سوداني');
    expect(texts).toContain('٥٠٠٫٠٠ جنيه سوداني');
    expect(texts).toContain('٣٢');
  });

  it('includes every passenger row plus the header row in the table', () => {
    const doc = buildTicketDocument(sampleTicket());
    const tableNode = collectContent(doc.content).find((n) => n.table);
    expect(tableNode.table.body.length).toBe(3);
    expect(tableNode.table.headerRows).toBe(1);
    expect(collectTexts({ content: tableNode })).toContain('خالد Hassan');
  });

  it('embeds the logo image when a data URI is provided', () => {
    const doc = buildTicketDocument(sampleTicket(), {
      logoDataUri: 'data:image/png;base64,AAA=',
    });
    expect(doc.images).toHaveProperty('logo');
    expect(JSON.stringify(doc.content)).toContain('image');
    expect(JSON.stringify(doc.content)).toContain('"logo"');
  });

  it('omits the logo block when no data URI is provided', () => {
    const doc = buildTicketDocument(sampleTicket());
    expect(doc.images).toEqual({});
  });

  it('degrades gracefully for empty passenger lists and missing values', () => {
    const doc = buildTicketDocument({
      bookingId: 'B-2',
      passengers: [],
      seatNumbers: [],
    });
    const texts = collectTexts(doc);
    expect(texts).toContain('—');
    const tableNode = collectContent(doc.content).find((n) => n.table);
    expect(tableNode.table.body.length).toBe(1);
  });

  it('embeds document metadata', () => {
    const doc = buildTicketDocument(sampleTicket());
    expect(doc.info?.title).toBe('تذكرة B-1');
    expect(doc.info?.author).toBe('تفية');
  });
});
