import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { PaymentAccountsService } from './payment-accounts.service';
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payment-accounts')
export class PaymentAccountsController {
  constructor(private readonly svc: PaymentAccountsService) {}
  @Get() getAll() { return this.svc.getAll(); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Patch(':id/toggle-active') toggleActive(@Param('id') id: string) { return this.svc.toggleActive(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
