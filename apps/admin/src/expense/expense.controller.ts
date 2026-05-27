import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { ExpenseService } from './expense.service';
@UseGuards(AuthGuard('jwt'))
@Controller('admin/expenses')
export class ExpenseController {
  constructor(private readonly svc: ExpenseService) {}
  @Get() getAll() { return this.svc.getAll(); }
  @Post() create(@Body() body: { amount: number; reason: string }) { return this.svc.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Get('total') getTotal() { return this.svc.getTotal(); }
}
