import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayoutService } from '../service/payout.service';
import { RequestPayoutDto, UpdateAccountDto } from '../dto/payout.dto';

@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('dashboard-stats')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardStats(@Req() req: any) {
    const data = await this.payoutService.getDashboardStats(req.user.id);
    return { data };
  }

  @Get('trips')
  @UseGuards(AuthGuard('jwt'))
  async getTrips(@Req() req: any) {
    const data = await this.payoutService.getTrips(req.user.id);
    return { data };
  }

  @Post('request')
  @UseGuards(AuthGuard('jwt'))
  async requestPayout(@Req() req: any, @Body() body: RequestPayoutDto) {
    return this.payoutService.requestPayout(req.user.id, body.tripId);
  }

  @Get('requests')
  @UseGuards(AuthGuard('jwt'))
  async getRequests(@Req() req: any) {
    const data = await this.payoutService.getRequests(req.user.id);
    return { data };
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  async getHistory(@Req() req: any) {
    const data = await this.payoutService.getHistory(req.user.id);
    return { data };
  }

  @Get('account')
  @UseGuards(AuthGuard('jwt'))
  async getAccount(@Req() req: any) {
    const data = await this.payoutService.getAccount(req.user.id);
    return { data };
  }

  @Put('account')
  @UseGuards(AuthGuard('jwt'))
  async updateAccount(@Req() req: any, @Body() body: UpdateAccountDto) {
    const data = await this.payoutService.updateAccount(req.user.id, body);
    return { data };
  }
}
