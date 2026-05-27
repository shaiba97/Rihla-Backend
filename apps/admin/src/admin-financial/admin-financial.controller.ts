import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminFinancialService } from './admin-financial.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/financial')
export class AdminFinancialController {
  constructor(private readonly svc: AdminFinancialService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboardSummary(); }

  @Get('overview')
  getOverview() { return this.svc.getOverview(); }

  @Get('pending')
  getPending() { return this.svc.getPendingPayments(); }

  @Get('earnings')
  getEarnings(@Query('period') period: string) { return this.svc.getEarnings((period ?? 'monthly') as any); }

  @Get('performance')
  getPerformance(@Query('period') period: string) { return this.svc.getPerformance((period ?? 'monthly') as any); }

  @Post('confirm/:id')
  confirmPayment(@Param('id') id: string) { return this.svc.confirmPayment(id); }

  @Post('reject/:id')
  rejectPayment(@Param('id') id: string, @Body() body: { reason?: string }) { return this.svc.rejectPayment(id, body?.reason); }
}
