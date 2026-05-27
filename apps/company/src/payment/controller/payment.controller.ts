import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from '../service/payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  async getSummary(@Req() req: any) {
    const data = await this.paymentService.getFinancialSummary(req.user.id);
    return { data };
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'))
  async getPerformance(@Req() req: any, @Query('period') period: string) {
    const data = await this.paymentService.getPerformance(req.user.id, (period ?? 'monthly') as any);
    return { data };
  }
}
