import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { FileInterceptor } from '@nestjs/platform-express'; import * as multer from 'multer'; import * as path from 'path'; import * as fs from 'fs'; import { AwardService } from './award.service';

const mkdir = (dir: string) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const withdrawalsDir = path.join(__dirname, '../../../uploads/withdrawals');
mkdir(withdrawalsDir);

const awardReceiptsDir = path.join(__dirname, '../../../uploads/award-receipts');
mkdir(awardReceiptsDir);

const receiptUpload = (dir: string, prefix: string) => FileInterceptor('receiptFile', {
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const captureReceipt = (dir: string, prefix: string, file?: Express.Multer.File) => {
  if (!file?.buffer) return { receiptFile: undefined, receiptData: undefined, receiptMime: undefined };
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
  try {
    fs.writeFileSync(path.join(dir, filename), file.buffer);
  } catch {
    // disk copy is best-effort; DB copy below is the source of truth
  }
  return {
    receiptFile: `/uploads/${path.basename(dir)}/${filename}`,
    receiptData: file.buffer.toString('base64'),
    receiptMime: file.mimetype,
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('admin/awards')
export class AwardController {
  constructor(private readonly svc: AwardService) {}
  @Get('packs') getPacks() { return this.svc.getPacks(); }
  @Post('packs') createPack(@Body() body: any) { return this.svc.createPack(body); }
  @Patch('packs/:id') updatePack(@Param('id') id: string, @Body() body: any) { return this.svc.updatePack(id, body); }
  @Delete('packs/:id') removePack(@Param('id') id: string) { return this.svc.removePack(id); }
  @Get('user/:userId') getUserAwards(@Param('userId') userId: string) { return this.svc.getUserAwards(userId); }
  @Get('pending') getPending() { return this.svc.getPending(); }

  @Post('approve/:id')
  @UseInterceptors(receiptUpload(awardReceiptsDir, 'award'))
  approve(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.approve(id, captureReceipt(awardReceiptsDir, 'award', file));
  }

  @Post('reject/:id')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.reject(id, body?.reason);
  }

  @Get('history')
  getHistory() { return this.svc.getHistory(); }

  @Get('withdrawals/pending')
  getPendingWithdrawals() { return this.svc.getPendingWithdrawals(); }

  @Get('withdrawals/history')
  getWithdrawalHistory() { return this.svc.getWithdrawalHistory(); }

  @Post('withdrawals/:id/approve')
  @UseInterceptors(receiptUpload(withdrawalsDir, 'withdraw'))
  approveWithdrawal(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.approveWithdrawal(id, captureReceipt(withdrawalsDir, 'withdraw', file));
  }

  @Post('withdrawals/:id/reject')
  rejectWithdrawal(@Param('id') id: string) { return this.svc.rejectWithdrawal(id); }
}
