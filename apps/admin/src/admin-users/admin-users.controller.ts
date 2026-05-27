import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport'; import { AdminUsersService } from './admin-users.service';
@UseGuards(AuthGuard('jwt'))
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get() findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '20', @Query('search') search?: string, @Query('role') role?: string) {
    return this.svc.findAll({ page: +page || 1, limit: +limit || 20, search: search || undefined, role: role || undefined });
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Patch(':id/toggle-active') toggleActive(@Param('id') id: string) { return this.svc.toggleActive(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
