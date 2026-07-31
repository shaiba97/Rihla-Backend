import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AdminPayoutService } from './admin-payout.service';

const payoutsDir = path.join(__dirname, '../../../uploads/payouts');
if (!fs.existsSync(payoutsDir)) fs.mkdirSync(payoutsDir, { recursive: true });

const payoutUpload = FileInterceptor('receiptFile', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
    if (/^image\/(jpeg|jpg|png|webp|heic)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('نوع الملف غير مدعوم — JPEG, PNG, WebP, HEIC'), false);
    }
  },
});

function captureReceipt(file: Express.Multer.File | undefined) {
  if (!file?.buffer) return { receiptFile: undefined, receiptData: undefined, receiptMime: undefined };
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `payout_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  try {
    fs.writeFileSync(path.join(payoutsDir, filename), file.buffer);
  } catch {
    // disk copy is best-effort; DB copy below is the source of truth
  }
  return {
    receiptFile: `/uploads/payouts/${filename}`,
    receiptData: file.buffer.toString('base64'),
    receiptMime: file.mimetype,
  };
}

@UseGuards(AuthGuard('jwt'))
@Controller('admin/payout')
export class AdminPayoutController {
  constructor(private readonly svc: AdminPayoutService) {}

  @Get('companies')
  getCompanies() { return this.svc.getCompanies(); }

  @Get('company/:id/trips')
  getCompanyTrips(@Param('id') id: string) { return this.svc.getCompanyTrips(id); }

  @Post('pay-trip/:tripId')
  @UseInterceptors(payoutUpload)
  payTrip(@Param('tripId') tripId: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.payTrip(tripId, captureReceipt(file));
  }

  @Post('pay-all/:companyId')
  @UseInterceptors(payoutUpload)
  payAll(@Param('companyId') companyId: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.payAll(companyId, captureReceipt(file));
  }

  @Get('requests')
  getRequests() { return this.svc.getRequests(); }

  @Post('requests/:id/approve')
  @UseInterceptors(payoutUpload)
  approveRequest(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.approveRequest(id, captureReceipt(file));
  }

  @Post('requests/:id/reject')
  rejectRequest(@Param('id') id: string) {
    return this.svc.rejectRequest(id);
  }

  @Get('history')
  getHistory() { return this.svc.getHistory(); }

  @Get('stats')
  getStats() { return this.svc.getStats(); }
}
