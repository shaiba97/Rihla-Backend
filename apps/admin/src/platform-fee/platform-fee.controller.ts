import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { PlatformFeeService } from './platform-fee.service';
@UseGuards(AuthGuard('jwt'))
@Controller('admin/platform-fee')
export class PlatformFeeController {
  constructor(private readonly svc: PlatformFeeService) {}
  @Get() getAll() { return this.svc.getAll(); }
  @Get('active') getActive() { return this.svc.getActive(); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Patch(':id/activate') activate(@Param('id') id: string) { return this.svc.activate(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
