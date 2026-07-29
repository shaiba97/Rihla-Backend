import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdminPayoutService } from './admin-payout.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/payout')
export class AdminPayoutController {
  constructor(private readonly svc: AdminPayoutService) {}

  @Get('companies')
  getCompanies() { return this.svc.getCompanies(); }

  @Get('company/:id/trips')
  getCompanyTrips(@Param('id') id: string) { return this.svc.getCompanyTrips(id); }

  @Post('pay-trip/:tripId')
  @UseInterceptors(FileInterceptor('receiptFile'))
  payTrip(@Param('tripId') tripId: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.payTrip(tripId, file);
  }

  @Post('pay-all/:companyId')
  @UseInterceptors(FileInterceptor('receiptFile'))
  payAll(@Param('companyId') companyId: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.payAll(companyId, file);
  }

  @Get('requests')
  getRequests() { return this.svc.getRequests(); }

  @Post('requests/:id/approve')
  @UseInterceptors(FileInterceptor('receiptFile'))
  approveRequest(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.svc.approveRequest(id, file);
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
