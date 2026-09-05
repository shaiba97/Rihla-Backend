/**
 * Dev-only preview generator for the designed passenger list (PDF) renderer.
 * Writes a PDF (document) + a PNG preview of the first page so the RTL
 * layout, palette and pagination can be eyeballed / machine-checked.
 *
 *   npx ts-node scripts/test-passenger-canvas.ts [output-dir]
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { drawPassengerListCanvas } from '../libs/pdf/src/passenger-canvas.util';

const outDir = process.argv[2] ?? os.tmpdir();

const trip = {
  id: 'demo-trip',
  presence_time: '06:30',
  fromState: 'الخرطوم',
  fromCity: 'الخرطوم',
  fromStation: 'محطة الميناء',
  departureDate: new Date('2026-09-06T07:30:00.000Z'),
  departureTime: '07:30',
  toState: 'البحر الأحمر',
  toCity: 'بورتسودان',
  toStation: 'محطة بورتسودان',
  arrivalDate: new Date('2026-09-06T17:45:00.000Z'),
  arrivalTime: '17:45',
  status: 'CONFIRMED',
  Bus: {
    name: 'عنداء للسفر',
    chairs: 48,
    plate: { numbers: '1294', arabic: 'س ع 1294', english: 'SA 1294' },
  },
};

const rows = Array.from({ length: 7 }, (_, i) => ({
  name: i % 2 ? 'فاطمة إبراهيم حسن عبد القادر' : 'أحمد محمد علي موسى الشريف',
  age: 20 + (i % 25),
  gender: i % 2 ? 'FEMALE' : 'MALE',
  seatNumber: i + 1,
  contact: `09${10000000 + i}`,
}));

async function main() {
  let logoBuffer: Buffer | null = null;
  const logoPath = path.join(__dirname, '..', 'assets', 'companyLogo.png');
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }

  const canvas = drawPassengerListCanvas(trip, rows, {
    logoBuffer,
    generatedAt: new Date('2026-09-05T10:00:00.000Z'),
  });

  const pdf = await canvas.toBuffer('pdf');
  const png = await canvas.toBuffer('png');

  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, 'passenger-canvas-preview.pdf');
  const pngPath = path.join(outDir, 'passenger-canvas-preview.png');
  fs.writeFileSync(pdfPath, pdf);
  fs.writeFileSync(pngPath, png);

  console.log(`PDF -> ${pdfPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
  console.log(`PNG preview -> ${pngPath} (${(png.length / 1024).toFixed(1)} KB)`);
  console.log(`signature check: ${pdf.subarray(0, 5).toString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});