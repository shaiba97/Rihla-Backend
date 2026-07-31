import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { FileInterceptor } from '@nestjs/platform-express'; import * as multer from 'multer'; import * as path from 'path'; import * as fs from 'fs'; import { AwardService } from './award.service';

const mkdir = (dir: string) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const withdrawalsDir = path.resolve('./uploads/withdrawals');
mkdir(withdrawalsDir);
const withdrawalStorage = multer.diskStorage({
  destination: (_r, _f, cb) => cb(null, withdrawalsDir),
  filename: (_r, f, cb) => cb(null, `withdraw_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`),
});

const awardReceiptsDir = path.join(__dirname, '../../../../uploads/award-receipts');
mkdir(awardReceiptsDir);
const awardReceiptStorage = multer.diskStorage({
  destination: (_r, _f, cb) => cb(null, awardReceiptsDir),
  filename: (_r, f, cb) => cb(null, `award_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`),
});

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
  @UseInterceptors(FileInterceptor('receiptFile', { storage: awardReceiptStorage, limits: { fileSize: 5 * 1024 * 1024 } }))
  approve(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const receiptFile = file ? `/uploads/award-receipts/${file.filename}` : undefined;
    return this.svc.approve(id, receiptFile);
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
  @UseInterceptors(FileInterceptor('receiptFile', { storage: withdrawalStorage, limits: { fileSize: 5 * 1024 * 1024 } }))
  approveWithdrawal(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const receiptFile = file ? `/uploads/withdrawals/${file.filename}` : undefined;
    return this.svc.approveWithdrawal(id, receiptFile);
  }

  @Post('withdrawals/:id/reject')
  rejectWithdrawal(@Param('id') id: string) { return this.svc.rejectWithdrawal(id); }
}
