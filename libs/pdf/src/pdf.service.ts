import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '@app/prisma';
import { setupPdfmake, renderPdf } from './pdfmake.util';
import { buildTicketDocument } from './ticket-pdf.service';
import { buildPassengerListDocument } from './passenger-list-pdf.service';
import type { TicketData } from './ticket-pdf-data.interface';

/**
 * Facade for all in-app PDF generation.
 *
 * Public API is unchanged from the previous PDFKit implementation —
 * `generateTicket`, `generatePassengerList`, `generateTicketBuffer` and
 * `generatePassengerListBuffer` keep their signatures and return shapes.
 * Rendering now goes through pdfmake 0.3.11, which shapes and reorders
 * Arabic automatically, so all ticket text is passed as plain logical
 * Unicode (no arabic-reshaper / bidi-js preprocessing).
 */
@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);
  private outputDir = './upload';
  private logoBuffer: Buffer | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.loadResources();
    const fonts = setupPdfmake();
    if (!fonts) {
      this.logger.warn('Could not locate Tajawal fonts for pdfmake');
    }
  }

  private loadResources() {
    // The compiled output can live in several layouts (webpack bundle dir,
    // tsconfig lib outDir, or the repo root during ts-node), so resolve the
    // logo asset against a set of candidate locations.
    const baseCandidates = [
      __dirname,
      path.join(__dirname, '..'),
      path.join(__dirname, '..', '..'),
      path.join(__dirname, '..', '..', '..'),
      process.cwd(),
    ];

    try {
      for (const base of baseCandidates) {
        const logoPath = path.join(base, 'assets', 'customerLogo.png');
        if (fs.existsSync(logoPath)) {
          this.logoBuffer = fs.readFileSync(logoPath);
          this.logger.log(`Loaded customer logo from ${logoPath}`);
          break;
        }
      }

      if (!this.logoBuffer) {
        this.logger.warn(
          'Could not locate customer logo, continuing without it',
        );
      }
    } catch {
      this.logger.warn('Could not load customer logo, continuing without it');
    }
  }

  private getLogoDataUri(): string | null {
    return this.logoBuffer
      ? `data:image/png;base64,${this.logoBuffer.toString('base64')}`
      : null;
  }

  // Main ticket generation
  async generateTicket(
    bookingId: string,
    paymentData?: any,
  ): Promise<{ publicUrl: string; filePath: string; buffer: Buffer | null }> {
    void paymentData;
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
            Customer: { select: { name: true } },
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
      const booking = payment.Booking;
      const trip = booking.Trip;
      const bus = trip?.Bus;
      const passengers = (booking.passenger ?? []) as any[];

      const ticketData: TicketData = {
        bookingId,
        createdAt: booking.createdAt,
        customerName: booking.Customer?.name ?? '',
        bus,
        trip,
        passengers,
        seatNumbers: booking.seatNumbers ?? [],
        payment: {
          platformFeeAmount: Number(payment.platformFeeAmount ?? 0),
          companyAmount: Number(payment.companyAmount ?? 0),
          totalAmount: Number(payment.totalAmount ?? 0),
          price: Number(payment.price ?? 0),
          currency: payment.currency ?? 'جنيه سوداني',
          paymentMethod: payment.paymentMethod ?? '',
        },
        qrData: `BOOKING:${bookingId}`,
      };

      const buf = await this.generateTicketBuffer(ticketData);
      buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
      fs.writeFileSync(outputPath, buffer);
      this.logger.log(
        `Ticket saved -> ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`,
      );
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
      const passengerRows = (bookings || []).flatMap((b: any) => {
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

      const buf = await this.generatePassengerListBuffer(trip, passengerRows);
      fs.writeFileSync(outputPath, Buffer.from(buf));
      this.logger.log(
        `Passenger list saved -> ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`,
      );
    } catch (error: any) {
      const errStack = error?.stack || error?.message || String(error);
      this.logger.error(
        `فشل في إنشاء ملف PDF لقائمة الركاب ${trip.id}`,
        errStack,
      );
      fs.writeFileSync(outputPath, 'PDF placeholder');
    }

    return { publicUrl, filePath: outputPath };
  }

  async generateTicketBuffer(ticketData: TicketData): Promise<Buffer> {
    const document = buildTicketDocument(ticketData, {
      logoDataUri: this.getLogoDataUri(),
    });
    return renderPdf(document);
  }

  async generatePassengerListBuffer(
    trip: any,
    passengerRows: any[],
  ): Promise<Buffer> {
    const document = buildPassengerListDocument(trip, passengerRows);
    return renderPdf(document);
  }
}
