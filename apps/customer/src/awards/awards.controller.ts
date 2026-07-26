import { Controller, Get, Req, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { AwardsService } from './awards.service';
@UseGuards(AuthGuard('jwt'))
@Controller('awards')
export class AwardsController {
  constructor(private readonly svc: AwardsService) {}
  @Get() getMyAwards(@Req() req: any) { return this.svc.getMyAwards(req.user.id); }
  @Get('packs') getPacks() { return this.svc.getPacks(); }
}
