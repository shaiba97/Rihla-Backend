import { describe, it, expect } from '@jest/globals';
import { buildPassengerListDocument } from './passenger-list-pdf.service';
import type { PassengerRow } from './passenger-list-pdf.service';

const TEAL = '#042F2E';
const WHITE = '#FFFFFF';

const rows: PassengerRow[] = [
  {
    name: 'أحمد محمد علي',
    age: 32,
    gender: 'MALE',
    seatNumber: 1,
    contact: '0911111111',
  },
  {
    name: 'فاطمة إبراهيم',
    age: 28,
    gender: 'FEMALE',
    seatNumber: 2,
    contact: '0922222222',
  },
];

describe('buildPassengerListDocument', () => {
  it('renders a landscape A4 document', () => {
    const doc = buildPassengerListDocument(
      { fromCity: 'الخرطوم', toCity: 'بورتسودان' },
      rows,
    );
    expect(doc.pageSize).toBe('A4');
    expect(doc.pageOrientation).toBe('landscape');
  });

  it('shows the route in the title', () => {
    const doc = buildPassengerListDocument(
      { fromCity: 'الخرطوم', toCity: 'بورتسودان' },
      rows,
    );
    const title = doc.content[0] as any;
    expect(String(title.text)).toContain('الخرطوم');
    expect(String(title.text)).toContain('بورتسودان');
  });

  it('has a teal header row with white bold text and no vertical borders', () => {
    const doc = buildPassengerListDocument(
      { fromCity: 'الخرطوم', toCity: 'بورتسودان' },
      rows,
    );
    const table = doc.content[1] as any;
    const header = table.table.body[0];
    expect(header).toHaveLength(6);
    for (const cell of header) {
      expect(cell.fillColor).toBe(TEAL);
      expect(cell.color).toBe(WHITE);
      expect(cell.bold).toBe(true);
    }
    expect(table.layout.vLineWidth()).toBe(0);
  });

  it('writes one column per passenger header', () => {
    const doc = buildPassengerListDocument({}, rows);
    const table = doc.content[1] as any;
    const headerTexts = table.table.body[0].map((c: any) => c.text);
    expect(headerTexts).toEqual([
      '#',
      'المقعد',
      'الجنس',
      'العمر',
      'جهة الاتصال',
      'اسم الراكب',
    ]);
  });

  it('renders each row and formats numbers in Arabic-Indic', () => {
    const doc = buildPassengerListDocument({}, rows);
    const table = doc.content[1] as any;
    expect(table.table.body.length).toBe(rows.length + 1);
    const bodyTexts = JSON.stringify(table.table.body.slice(1));
    expect(bodyTexts).toContain('١');
    expect(bodyTexts).toContain('٢');
    expect(bodyTexts).toContain('أحمد محمد علي');
    expect(bodyTexts).toContain('فاطمة إبراهيم');
    expect(bodyTexts).toContain('0922222222');
  });

  it('handles an empty row list with just the header', () => {
    const doc = buildPassengerListDocument({}, []);
    const table = doc.content[1] as any;
    expect(table.table.body.length).toBe(1);
  });
});
