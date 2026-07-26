import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { AwardService } from './award.service';
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
  @Post('approve/:id') approve(@Param('id') id: string) { return this.svc.approve(id); }
  @Post('reject/:id') reject(@Param('id') id: string) { return this.svc.reject(id); }
}
