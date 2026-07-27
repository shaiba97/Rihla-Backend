import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AwardsService } from './awards.service';

@UseGuards(AuthGuard('jwt'))
@Controller('awards')
export class AwardsController {
  constructor(private readonly svc: AwardsService) {}

  @Get()
  getMyAwards(@Req() req: any) {
    return this.svc.getMyAwards(req.user.id);
  }

  @Get('packs')
  getPacks(@Req() req: any) {
    return this.svc.getPacks(req.user.id);
  }

  @Post('request/:packId')
  requestAward(@Req() req: any, @Param('packId') packId: string) {
    return this.svc.requestAward(req.user.id, packId);
  }

  @Get('pack/:packId')
  getPackDetail(@Req() req: any, @Param('packId') packId: string) {
    return this.svc.getPackDetail(req.user.id, packId);
  }
}
