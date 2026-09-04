import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '@app/prisma';
import PDFKit from 'pdfkit';

// Interface for ticket data (same as before)
interface TicketData {
  bookingId: string;
  customerName?: string;
  bus?: any;
  trip?: any;
  passengers?: any[];
  payment?: any;
  seatNumbers?: number[];
  qrData?: string;
}

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);
  private outputDir = './upload';
  private tajawalRegular: Buffer | null = null;
  private tajawalBold: Buffer | null = null;
  private logoBuffer: Buffer | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.loadResources();
  }

  private loadResources() {
    try {
      // Load Tajawal fonts for Arabic support
      const fontPathRegular = path.join(__dirname, '..', '..', '..', 'fonts', 'Tajawal-Regular.ttf');
      const fontPathBold = path.join(__dirname, '..', '..', '..', 'fonts', 'Tajawal-Bold.ttf');

      if (fs.existsSync(fontPathRegular) && fs.existsSync(fontPathBold)) {
        this.tajawalRegular = fs.readFileSync(fontPathRegular);
        this.tajawalBold = fs.readFileSync(fontPathBold);
        this.logger.log('Loaded Tajawal fonts for Arabic support');
      }
    } catch (error) {
      this.logger.warn('Could not load custom fonts, using defaults');
    }

    try {
      // Load logo
      const logoPath = path.join(__dirname, '..', '..', '..', 'assets', 'companyLogo.png');
      if (fs.existsSync(logoPath)) {
        this.logoBuffer = fs.readFileSync(logoPath);
        this.logger.log('Loaded company logo');
      }
    } catch (error) {
      this.logger.warn('Could not load company logo, continuing without it');
    }
  }

  // Helper function to reverse Arabic text for proper display in PDFKit
  private reverseArabic(text: string): string {
    if (!text) return '';
    // Simple character reversal for Arabic text
    // Note: For production, consider using a proper Arabic shaping library
    return text.split('').reverse().join('');
  }

  // Helper functions for formatting
  private toArabicIndic(num: any): string {
    if (num == null || num === '') return '—';
    return String(num).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private formatDateShort(val: any): string {
    if (!val) return '—';
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const dd = this.toArabicIndic(String(d.getDate()).padStart(2, '0'));
    const mm = this.toArabicIndic(String(d.getMonth() + 1).padStart(2, '0'));
    const yy = this.toArabicIndic(String(d.getFullYear()));
    return `${dd} / ${mm} / ${yy}`;
  }

  private formatTime(val: any): string {
    if (!val) return '—';
    let h: number, m: number;
    if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
      [h, m] = val.split(':').map(Number);
    } else {
      const d = val instanceof Date ? val : new Date(val);
      h = d.getHours();
      m = d.getMinutes();
    }
    const period = h < 12 ? 'ص' : 'م';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${this.toArabicIndic(String(h12).padStart(2, '0'))}:${this.toArabicIndic(String(m).padStart(2, '0'))} ${period}`;
  }

  private formatMoney(amount: any, currency = 'جنيه سوداني'): string {
    if (amount == null || amount === '') return '—';
    const n = Number(amount);
    const fixed = n.toFixed(2).replace('.', '٫');
    return `${this.toArabicIndic(fixed)} ${currency}`;
  }

  private genderLabel(g: any): string {
    const map: Record<string, string> = {
      MALE: 'ذكر',
      FEMALE: 'أنثى',
      male: 'ذكر',
      female: 'أنثى',
      M: 'ذكر',
      F: 'أنثى',
    };
    return map[g] || g || '—';
  }

  // Get font names based on available resources
  private getFontNames(): { regular: string; bold: string } {
    const fontRegular = this.tajawalRegular ? 'Tajawal' : 'Helvetica';
    const fontBold = this.tajawalBold ? 'TajawalBold' : 'Helvetica-Bold';
    return { regular: fontRegular, bold: fontBold };
  }

  // Main ticket generation using PDFKit
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
        customerName: booking.Customer?.name ?? '',
        bus,
        trip,
        passengers,
        seatNumbers: booking.seatNumbers ?? [],
        payment: {
          platformFeeAmount: payment.platformFeeAmount ?? 0,
          companyAmount: payment.companyAmount ?? 0,
          totalAmount: payment.totalAmount ?? 0,
          price: payment.price ?? 0,
          currency: payment.currency ?? 'جنيه سوداني',
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
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margin: 32, // 32px margin as specified in design tokens
        layout: 'portrait',
        autoFirstPage: false, // We'll add the page manually
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Start the PDF
      doc.addPage();

      // Constants for design
      const PAGE_WIDTH = doc.page.width;
      const PAGE_HEIGHT = doc.page.height;
      const MARGIN = 32; // 32px margin
      const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

      // Colors (only the three specified)
      const BLACK = '#000000';
      const WHITE = '#FFFFFF';
      const TAFIYA_TEAL = '#042F2E';

      // Font setup
      const { regular: fontRegular, bold: fontBold } = this.getFontNames();

      // Register custom fonts if available
      if (this.tajawalRegular) {
        doc.registerFont('Tajawal', this.tajawalRegular);
      }
      if (this.tajawalBold) {
        doc.registerFont('TajawalBold', this.tajawalBold);
      }

      // Start Y position
      let y = MARGIN;

      // SECTION 1 — HEADER
      // Right-hand side: [TAFIYA LOGO] تفية
      // Left-hand side: تاريخ إنشاء التذكرة + ticket.createdAt

      // Header content
      const headerTop = y;
      const logoSize = 40; // 40x40 pixels
      let logoX = PAGE_WIDTH - MARGIN - logoSize;
      let logoY = headerTop;

      // If logo exists, embed it
      if (this.logoBuffer) {
        try {
          doc.image(this.logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
          // Adjust the text position to be left of the logo with a gap
          const textWidth = (PAGE_WIDTH - 2 * MARGIN) / 2 - 10 - logoSize - 10; // reduce width for logo and gap
          // Left side: creation date
          const createdAtText = `تاريخ إنشاء التذكرة: ${new Date().toLocaleDateString('ar-SA')}`;
          doc
            .fontSize(10)
            .fill(BLACK)
            .text(createdAtText, MARGIN, y, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'left'
            });

          // Right side: brand name, positioned to the left of the logo
          doc
            .fontSize(24)
            .fill(TAFIYA_TEAL)
            .font(fontBold)
            .text('تفية', logoX - 10, y, { // 10 pixels gap between text and logo
              width: textWidth,
              align: 'right'
            });
        } catch (error) {
          this.logger.warn('Could not embed logo: ' + error.message);
          // Fallback to original text positioning without logo
          const createdAtText = `تاريخ إنشاء التذكرة: ${new Date().toLocaleDateString('ar-SA')}`;
          doc
            .fontSize(10)
            .fill(BLACK)
            .text(createdAtText, MARGIN, y, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'left'
            });

          // Right side: brand name
          doc
            .fontSize(24)
            .fill(TAFIYA_TEAL)
            .font(fontBold)
            .text('تفية', MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2 + 10, y, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'right'
            });
        }
      } else {
        // No logo, original layout
        const createdAtText = `تاريخ إنشاء التذكرة: ${new Date().toLocaleDateString('ar-SA')}`;
        doc
          .fontSize(10)
          .fill(BLACK)
          .text(createdAtText, MARGIN, y, {
            width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
            align: 'left'
          });

          // Right side: brand name
          doc
            .fontSize(24)
            .fill(TAFIYA_TEAL)
            .font(fontBold)
            .text('تفية', MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2 + 10, y, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'right'
            });
      }

      y += 50; // Move down for next section (logo size 40 + gap 10)

      // Add horizontal separator
      doc
        .lineWidth(1)
        .strokeColor(TAFIYA_TEAL)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();

      y += 20; // Space after separator

      // SECTION 2 — BUS DETAILS
      // Two-column layout
      const busName = ticketData.bus?.name || '—';
      const plateData = ticketData.bus?.plate || {};

      // Handle plate - it's stored as JSON
      let plateDisplay = '—';
      if (typeof plateData === 'string') {
        try {
          const plateObj = JSON.parse(plateData);
          plateDisplay = `${plateObj.numbers || ''} ${plateObj.arabic || ''} ${plateObj.english || ''}`.trim();
          if (!plateDisplay) plateDisplay = '—';
        } catch (e) {
          plateDisplay = plateData; // fallback to raw string
        }
      } else if (plateData && typeof plateData === 'object') {
        plateDisplay = `${plateData.numbers || ''} ${plateData.arabic || ''} ${plateData.english || ''}`.trim();
        if (!plateDisplay) plateDisplay = '—';
      }

      // Right column: bus name (label)
      doc
        .fontSize(10)
        .fill(BLACK)
        .text('اسم الحافلة', MARGIN, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

      // Left column: plate number (label)
      doc
        .fontSize(10)
        .fill(BLACK)
        .text('رقم اللوحة', MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

      y += 15;

      // Values
      doc
        .fontSize(12)
        .fill(BLACK)
        .font(fontBold)
        .text(busName, MARGIN, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

      doc
        .fontSize(12)
        .fill(BLACK)
        .font(fontBold)
        .text(plateDisplay, MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

      y += 25; // Space before separator

      // Add horizontal separator
      doc
        .lineWidth(1)
        .strokeColor(TAFIYA_TEAL)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();

      y += 20; // Space after separator

      // SECTION 3 — TRIP DETAILS
      // Two-column layout: departure (right) and arrival (left)

      const trip = ticketData.trip;
      if (trip) {
        // Two columns: left and right
        const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 2;
        const leftX = MARGIN;
        const rightX = MARGIN + colWidth;

        // Departure labels (right column visually)
        doc
          .fontSize(9)
          .fill(BLACK)
          .text('مدينة المغادرة', rightX, y, {
            width: colWidth - 10,
            align: 'left'
          });

          doc
            .fontSize(9)
            .fill(BLACK)
            .text('المحطة', rightX, y + 20, {
              width: colWidth - 10,
              align: 'left'
            });

            doc
              .fontSize(9)
              .fill(BLACK)
              .text('الولاية', rightX, y + 40, {
                width: colWidth - 10,
                align: 'left'
              });

              doc
                .fontSize(9)
                .fill(BLACK)
                .text('وقت المغادرة', rightX, y + 60, {
                  width: colWidth - 10,
                  align: 'left'
                });

                doc
                  .fontSize(9)
                  .fill(BLACK)
                  .text('تاريخ المغادرة', rightX, y + 80, {
                    width: colWidth - 10,
                    align: 'left'
                  });

        // Departure values
        doc
          .fontSize(11)
          .fill(BLACK)
          .font(fontBold)
          .text(this.reverseArabic(trip?.fromCity || '—'), rightX, y, {
            width: colWidth - 10,
            align: 'left'
          });

          doc
            .fontSize(11)
            .fill(BLACK)
            .font(fontBold)
            .text(this.reverseArabic(trip?.fromStation || '—'), rightX, y + 20, {
              width: colWidth - 10,
              align: 'left'
            });

            doc
              .fontSize(11)
              .fill(BLACK)
              .font(fontBold)
              .text(this.reverseArabic(trip?.fromState || '—'), rightX, y + 40, {
                width: colWidth - 10,
                align: 'left'
              });

              doc
                .fontSize(11)
                .fill(BLACK)
                .font(fontBold)
                .text(this.formatTime(trip?.departureTime), rightX, y + 60, {
                  width: colWidth - 10,
                  align: 'left'
                });

                doc
                  .fontSize(11)
                  .fill(BLACK)
                  .font(fontBold)
                  .text(this.formatDateShort(trip?.departureDate), rightX, y + 80, {
                    width: colWidth - 10,
                    align: 'left'
                  });

        // Arrival labels (left column visually)
        doc
          .fontSize(9)
          .fill(BLACK)
          .text('مدينة الوصول', leftX, y, {
            width: colWidth - 10,
            align: 'left'
          });

          doc
            .fontSize(9)
            .fill(BLACK)
            .text('المحطة', leftX, y + 20, {
              width: colWidth - 10,
              align: 'left'
            });

            doc
              .fontSize(9)
              .fill(BLACK)
              .text('الولاية', leftX, y + 40, {
                width: colWidth - 10,
                align: 'left'
              });

              doc
                .fontSize(9)
                .fill(BLACK)
                .text('وقت الوصول', leftX, y + 60, {
                  width: colWidth - 10,
                  align: 'left'
                });

                doc
                  .fontSize(9)
                  .fill(BLACK)
                  .text('تاريخ الوصول', leftX, y + 80, {
                    width: colWidth - 10,
                    align: 'left'
                  });

        // Arrival values
        doc
          .fontSize(11)
          .fill(BLACK)
          .font(fontBold)
          .text(this.reverseArabic(trip?.toCity || '—'), leftX, y, {
            width: colWidth - 10,
            align: 'left'
          });

          doc
            .fontSize(11)
            .fill(BLACK)
            .font(fontBold)
            .text(this.reverseArabic(trip?.toStation || '—'), leftX, y + 20, {
              width: colWidth - 10,
              align: 'left'
            });

            doc
              .fontSize(11)
              .fill(BLACK)
              .font(fontBold)
              .text(this.reverseArabic(trip?.toState || '—'), leftX, y + 40, {
                width: colWidth - 10,
                align: 'left'
              });

              doc
                .fontSize(11)
                .fill(BLACK)
                .font(fontBold)
                .text(this.formatTime(trip?.arrivalTime), leftX, y + 60, {
                  width: colWidth - 10,
                  align: 'left'
                });

                doc
                  .fontSize(11)
                  .fill(BLACK)
                  .font(fontBold)
                  .text(this.formatDateShort(trip?.arrivalDate), leftX, y + 80, {
                    width: colWidth - 10,
                    align: 'left'
                  });

        y += 100; // Move past the trip details
      }

      // Add horizontal separator
      doc
        .lineWidth(1)
        .strokeColor(TAFIYA_TEAL)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();

      y += 20; // Space after separator

      // SECTION 4 — PASSENGER DETAILS
      // Title
      doc
        .fontSize(12)
        .fill(BLACK)
        .font(fontBold)
        .text('بيانات الركاب', MARGIN, y, {
          width: PAGE_WIDTH - 2 * MARGIN,
          align: 'left'
        });

      y += 20;

      // Table headers
      const tableStartY = y;
      const colNames = ['الاسم', 'العمر', 'النوع', 'المقعد'];
      const colWidths = [
        (PAGE_WIDTH - 2 * MARGIN) * 0.4,
        (PAGE_WIDTH - 2 * MARGIN) * 0.2,
        (PAGE_WIDTH - 2 * MARGIN) * 0.2,
        (PAGE_WIDTH - 2 * MARGIN) * 0.2
      ];
      let colX = MARGIN;

      doc
        .fontSize(10)
        .fill(BLACK)
        .font(fontBold);

      colNames.forEach((colName, index) => {
        // For RTL text in headers, we need to reverse it
        doc.text(this.reverseArabic(colName), colX, tableStartY, {
          width: colWidths[index],
          align: 'left'
        });
        colX += colWidths[index];
      });

      y += 15; // Space below headers

      // Table rows
      const passengers = ticketData.passengers || [];
      const seatNumbers = ticketData.seatNumbers || [];

      passengers.forEach((passenger, index) => {
        const rowY = y;
        const seatNumber = seatNumbers[index] || '—';

        // Alternate row colors for readability
        if (index % 2 === 1) {
          doc
            .rect(MARGIN, rowY - 2, PAGE_WIDTH - 2 * MARGIN, 18)
            .fillColor('#f8f9fa') // very light gray
            .fill();
        }

        // Passenger data
        const name = passenger.name || '—';
        const age = passenger.age || '—';
        const gender = this.genderLabel(passenger.gender);

        doc
          .fontSize(10)
          .fill(BLACK)
          .text(this.reverseArabic(name), MARGIN, rowY, {
            width: colWidths[0],
            align: 'left'
          });

          doc
            .text(this.toArabicIndic(age), MARGIN + colWidths[0], rowY, {
              width: colWidths[1],
              align: 'left'
            });

          doc
            .text(gender, MARGIN + colWidths[0] + colWidths[1], rowY, {
              width: colWidths[2],
              align: 'left'
            });

          doc
            .text(this.toArabicIndic(seatNumber), MARGIN + colWidths[0] + colWidths[1] + colWidths[2], rowY, {
              width: colWidths[3],
              align: 'left'
            });

        y += 18; // Move to next row
      });

      y += 10; // Space after table

      // Add horizontal separator
      doc
        .lineWidth(1)
        .strokeColor(TAFIYA_TEAL)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();

      y += 20; // Space after separator

      // SECTION 5 — PAYMENT DETAILS
      // Two-column layout
      const pay = ticketData.payment || {};
      const seatCount = passengers.length || 1;
      const price = Number(pay.price ?? 0);
      const platformFee = Number(pay.platformFeeAmount ?? 0);
      const totalAmount = Number(pay.totalAmount ?? 0);
      const currency = pay.currency ?? 'جنيه سوداني';
      const paymentMethod = pay.paymentMethod ?? '—';

      // Right column: labels
      doc
        .fontSize(10)
        .fill(BLACK)
        .text('طريقة الدفع', MARGIN, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

        doc
          .fontSize(10)
          .fill(BLACK)
          .text('سعر التذكرة الواحدة', MARGIN, y + 20, {
            width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
            align: 'left'
          });

          doc
            .fontSize(10)
            .fill(BLACK)
            .text('إجمالي المبلغ المدفوع', MARGIN, y + 40, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'left'
            });

      // Left column: values
      doc
        .fontSize(10)
        .fill(BLACK)
        .font(fontBold)
        .text(this.reverseArabic(paymentMethod), MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2, y, {
          width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
          align: 'left'
        });

        doc
          .fontSize(10)
          .fill(BLACK)
          .font(fontBold)
          .text(`${this.formatMoney(price, currency)}`, MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2, y + 20, {
            width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
            align: 'left'
          });

          doc
            .fontSize(10)
            .fill(BLACK)
            .font(fontBold)
            .text(`${this.formatMoney(totalAmount, currency)}`, MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2, y + 40, {
              width: (PAGE_WIDTH - 2 * MARGIN) / 2 - 10,
              align: 'left'
            });

      y += 60; // Move past payment section

      // Finalize the PDF
      doc.end();
    });
  }

  async generatePassengerListBuffer(trip: any, passengerRows: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margin: 40, // Slightly larger margin for passenger list
        layout: 'landscape', // Landscape for better table layout
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Start the PDF
      doc.addPage();

      // Constants
      const PAGE_WIDTH = doc.page.width;
      const PAGE_HEIGHT = doc.page.height;
      const MARGIN = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
      const CONTENT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN;

      // Colors
      const BLACK = '#000000';
      const WHITE = '#FFFFFF';
      const TAFIYA_TEAL = '#042F2E';

      // Font setup
      const { regular: fontRegular, bold: fontBold } = this.getFontNames();

      let y = MARGIN;

      // Title
      const tripFrom = trip?.fromCity || '—';
      const tripTo = trip?.toCity || '—';
      doc
        .fontSize(16)
        .fill(TAFIYA_TEAL)
        .font(fontBold)
        .text(`قائمة الركاب — ${tripFrom} → ${tripTo}`, MARGIN, y, {
          width: PAGE_WIDTH - 2 * MARGIN,
          align: 'left'
        });

      y += 30;

      // Table headers
      const tableStartY = y;
      const headers = ['#', 'المقعد', 'الجنس', 'العمر', 'جهة الاتصال', 'اسم الراكب'];
      const colWidths = [30, 50, 50, 50, 150, (PAGE_WIDTH - 2 * MARGIN) - 330]; // Last column takes remaining space
      let colX = MARGIN;

      doc
        .fontSize(10)
        .fill(WHITE)
        .font(fontBold);

      // Draw header background
      doc
        .rect(MARGIN, tableStartY - 5, PAGE_WIDTH - 2 * MARGIN, 25)
        .fillColor(TAFIYA_TEAL)
        .fill();

      headers.forEach((header, index) => {
        // For RTL text in headers, reverse it
        doc.text(this.reverseArabic(header), colX, tableStartY, {
          width: colWidths[index],
          align: 'center'
        });
        colX += colWidths[index];
      });

      y += 25; // Move past headers

      // Table rows
      passengerRows.forEach((row, index) => {
        // Check if we need a new page
        if (y > PAGE_HEIGHT - MARGIN - 20) {
          doc.addPage();
          y = MARGIN;

          // Redraw headers on new page
          doc
            .rect(MARGIN, y - 5, PAGE_WIDTH - 2 * MARGIN, 25)
            .fillColor(TAFIYA_TEAL)
            .fill();

          colX = MARGIN;
          headers.forEach((header, index) => {
            doc.text(this.reverseArabic(header), colX, y, {
              width: colWidths[index],
              align: 'center'
            });
            colX += colWidths[index];
          });

          y += 25;
        }

        const rowY = y;

        // Alternate row colors
        if (index % 2 === 1) {
          doc
            .rect(MARGIN, rowY - 2, PAGE_WIDTH - 2 * MARGIN, 20)
            .fillColor('#f8f9fa')
            .fill();
        }

        // Row data
        const cells = [
          index + 1,
          row.seatNumber || '—',
          this.genderLabel(row.gender),
          this.toArabicIndic(row.age),
          row.contact || '—',
          row.name || '—',
        ];

        colX = MARGIN;
        doc
          .fontSize(9)
          .fill(BLACK);

        cells.forEach((cell, cellIndex) => {
          // For Arabic text in cells, we might need to reverse it
          // But for mixed content (numbers, English), we'll be careful
          let displayCell = String(cell);
          // Only reverse if it's primarily Arabic text (simplified check)
          if (/[؀-ۿ]/.test(displayCell)) {
            displayCell = this.reverseArabic(displayCell);
          }
          doc.text(displayCell, colX, rowY, {
            width: colWidths[cellIndex],
            align: 'left'
          });
          colX += colWidths[cellIndex];
        });

        y += 20; // Move to next row
      });

      // Finalize the PDF
      doc.end();
    });
  }
}