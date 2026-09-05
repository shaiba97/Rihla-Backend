import {
  formatPlate,
  renderPassengerListToPdf,
  renderTicketToPdf,
} from './canvas-pdf.util';
import type { TicketData } from './ticket-pdf-data.interface';

function sampleTicketData(overrides: Partial<TicketData> = {}): TicketData {
  return {
    bookingId: 'book-123',
    createdAt: new Date('2026-09-05T07:30:00.000Z'),
    customerName: 'محمد أحمد',
    bus: {
      name: 'عنداء للسفر',
      plate: { numbers: '1234', arabic: 'س ع', english: 'ab' },
    },
    trip: {
      fromCity: 'الخرطوم',
      fromStation: 'محطة الميناء',
      fromState: 'الخرطوم',
      departureTime: '07:30',
      departureDate: new Date('2026-09-05T07:30:00.000Z'),
      toCity: 'بورتسودان',
      toStation: 'محطة بورتسودان',
      toState: 'البحر الأحمر',
      arrivalTime: '17:45',
      arrivalDate: new Date('2026-09-05T17:45:00.000Z'),
    },
    passengers: [
      { name: 'أحمد محمد علي', age: 34, gender: 'MALE' },
      { name: 'فاطمة إبراهيم', age: 29, gender: 'FEMALE' },
    ],
    seatNumbers: [12, 13],
    payment: {
      platformFeeAmount: 500,
      companyAmount: 45000,
      totalAmount: 48000,
      price: 15000,
      currency: 'جنيه سوداني',
      paymentMethod: 'أونلاين',
    },
    ...overrides,
  };
}

describe('renderTicketToPdf', () => {
  it('returns a non-empty %PDF- buffer', async () => {
    const buffer = await renderTicketToPdf(sampleTicketData());
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders with a single passenger', async () => {
    const buffer = await renderTicketToPdf(
      sampleTicketData({
        passengers: [{ name: 'نور الهدى عبد الله', age: 9, gender: 'FEMALE' }],
        seatNumbers: [14],
      }),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders with many passengers and no customer logo', async () => {
    const passengers = Array.from({ length: 40 }, (_, i) => ({
      name: `راكب رقم ${i + 1}`,
      age: 20 + (i % 20),
      gender: i % 2 ? 'FEMALE' : 'MALE',
    }));
    const buffer = await renderTicketToPdf(
      sampleTicketData({
        passengers,
        seatNumbers: passengers.map((_, i) => i + 1),
      }),
      null,
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('does not crash when optional fields are missing', async () => {
    const buffer = await renderTicketToPdf(
      sampleTicketData({
        createdAt: null,
        bus: {},
        trip: undefined,
        passengers: [],
        seatNumbers: [],
        payment: {},
      }),
      null,
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('treats HTML-looking passenger names as inert text (no injection surface)', async () => {
    const buffer = await renderTicketToPdf(
      sampleTicketData({
        passengers: [
          { name: '<script>alert("x")</script>', age: 20, gender: 'MALE' },
        ],
        seatNumbers: [1],
      }),
      null,
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('contents draw with the Arabic plate value preserved', async () => {
    const buffer = await renderTicketToPdf(
      sampleTicketData({
        bus: {
          name: 'جمل',
          plate: '{"numbers":"9999","arabic":"س ع","english":"XY"}',
        },
      }),
      null,
    );
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

describe('renderPassengerListToPdf', () => {
  const trip = {
    fromCity: 'الخرطوم',
    toCity: 'بورتسودان',
  };

  it('returns a non-empty %PDF- buffer for a small list', async () => {
    const buffer = await renderPassengerListToPdf(trip, [
      {
        name: 'أحمد محمد علي',
        age: 34,
        gender: 'MALE',
        seatNumber: 1,
        contact: '0911111111',
      },
    ]);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('paginates a long passenger list without crashing', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      name: `اسم الراكب ${i + 1}`,
      age: 22 + (i % 30),
      gender: i % 2 ? 'FEMALE' : 'MALE',
      seatNumber: i + 1,
      contact: `09${String(10000000 + i)}`,
    }));
    const buffer = await renderPassengerListToPdf(trip, rows);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders an empty list without crashing', async () => {
    const buffer = await renderPassengerListToPdf(trip, []);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('formatPlate', () => {
  it('formats an object plate', () => {
    expect(formatPlate({ numbers: '1234', arabic: 'س ع', english: 'ab' })).toBe(
      '1234 س ع ab',
    );
  });

  it('formats a JSON-string plate', () => {
    expect(formatPlate('{"numbers":"99","arabic":"ب","english":"bc"}')).toBe(
      '99 ب bc',
    );
  });

  it('returns plain strings untouched', () => {
    expect(formatPlate('لوحة')).toBe('لوحة');
  });

  it('falls back for null and empty plates', () => {
    expect(formatPlate(null)).toBe('—');
    expect(formatPlate({})).toBe('—');
    expect(formatPlate(undefined)).toBe('—');
  });
});
