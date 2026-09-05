import { describe, it, expect, beforeAll } from '@jest/globals';
import { setupPdfmake, renderPdf } from './pdfmake.util';
import { PDFService } from './pdf.service';
import type { TicketData } from './ticket-pdf-data.interface';

const sampleTicket = (): TicketData => ({
  bookingId: 'IT-1',
  createdAt: new Date(2026, 8, 5, 8, 0),
  bus: {
    name: 'عنداء للسفر',
    plate: { numbers: 1234, arabic: 'س ع', english: 'ab' },
  },
  trip: {
    fromCity: 'الخرطوم',
    departureTime: '08:00',
    toCity: 'بورتسودان',
    arrivalTime: '14:00',
  },
  passengers: [{ name: 'أحمد محمد علي', age: 32, gender: 'MALE' }],
  seatNumbers: [12],
  payment: {
    price: 250,
    totalAmount: 500,
    currency: 'جنيه سوداني',
    paymentMethod: 'أونلاين',
  },
});

describe('pdfmake integration', () => {
  beforeAll(() => {
    const fonts = setupPdfmake();
    expect(fonts).not.toBeNull();
  });

  it('setupPdfmake finds the Tajawal fonts', () => {
    const fonts = setupPdfmake();
    expect(fonts?.regular).toMatch(/Tajawal-Regular\.ttf$/);
    expect(fonts?.bold).toMatch(/Tajawal-Bold\.ttf$/);
  });

  it('renderPdf produces a valid PDF with an embedded Tajawal font', async () => {
    const buffer = await renderPdf({
      pageSize: 'A4',
      defaultStyle: { font: 'Tajawal' },
      content: [{ text: 'تاريخ إنشاء التذكرة' }],
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.toString('latin1')).toContain('/FontFile2');
    expect(buffer.toString('latin1')).toContain('/ToUnicode');
  });

  it('PDFService.generateTicketBuffer renders a ticket PDF', async () => {
    const service = new PDFService({} as any);
    const buffer = await service.generateTicketBuffer(sampleTicket());
    expect(buffer.slice(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.toString('latin1')).toContain('/FontFile2');
  });

  it('PDFService.generatePassengerListBuffer renders a landscape PDF', async () => {
    const service = new PDFService({} as any);
    const buffer = await service.generatePassengerListBuffer(
      { fromCity: 'الخرطوم', toCity: 'بورتسودان' },
      [{ name: 'أحمد', age: 32, gender: 'M', seatNumber: 1, contact: '09' }],
    );
    const latin = buffer.toString('latin1');
    expect(latin).toContain('/MediaBox');
    expect(latin.includes('841')).toBe(true);
  });
});
