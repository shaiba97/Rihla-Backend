import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { PDFService } from './pdf.service';

@Module({
  imports: [PrismaModule],
  providers: [PDFService],
  exports: [PDFService],
})
export class PdfModule {}
