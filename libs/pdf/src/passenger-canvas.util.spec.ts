import { renderPassengerListCanvasPdf } from './passenger-canvas.util';
import type { PassengerListImageRow } from './passenger-canvas.util';

function sampleTrip(overrides: any = {}) {
  return {
    id: 'trip-1',
    fromState: 'الخرطوم',
    fromCity: 'الخرطوم',
    fromStation: 'محطة الميناء',
    departureDate: new Date('2026-09-05T07:30:00.000Z'),
    departureTime: '07:30',
    toState: 'البحر الأحمر',
    toCity: 'بورتسودان',
    toStation: 'محطة بورتسودان',
    arrivalDate: new Date('2026-09-05T17:45:00.000Z'),
    arrivalTime: '17:45',
    Bus: {
      name: 'عنداء للسفر',
      chairs: 48,
      plate: { numbers: '1234', arabic: 'س ع', english: 'ab' },
    },
    ...overrides,
  };
}

function sampleRows(count: number): PassengerListImageRow[] {
  return Array.from({ length: count }, (_, i) => ({
    name: i % 2 ? 'فاطمة إبراهيم حسن' : 'أحمد محمد علي موسى',
    age: 20 + (i % 30),
    gender: i % 2 ? 'FEMALE' : 'MALE',
    seatNumber: i + 1,
    contact: `09${String(10000000 + i)}`,
  }));
}

describe('renderPassengerListCanvasPdf', () => {
  it('returns a non-empty %PDF- buffer for a small list', async () => {
    const buffer = await renderPassengerListCanvasPdf(
      sampleTrip(),
      sampleRows(3),
    );
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('paginates a long passenger list without crashing', async () => {
    const buffer = await renderPassengerListCanvasPdf(
      sampleTrip(),
      sampleRows(60),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('renders an empty list without crashing', async () => {
    const buffer = await renderPassengerListCanvasPdf(sampleTrip(), []);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles a JSON-string plate and missing bus details', async () => {
    const buffer = await renderPassengerListCanvasPdf(
      sampleTrip({
        Bus: {
          name: 'جمل',
          plate: '{"numbers":"9999","arabic":"س ع","english":"XY"}',
          chairs: 40,
        },
      }),
      sampleRows(2),
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('falls back when trip/bus fields are undefined', async () => {
    const buffer = await renderPassengerListCanvasPdf(
      { id: 'trip-x', Bus: undefined },
      [{ name: 'راكب', age: 20, gender: 'MALE', seatNumber: 1 }],
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('accepts a supplied generatedAt and renders without a logo', async () => {
    const buffer = await renderPassengerListCanvasPdf(
      sampleTrip(),
      sampleRows(2),
      { generatedAt: new Date('2026-09-05T10:00:00.000Z') },
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
