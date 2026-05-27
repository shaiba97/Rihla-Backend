import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportContactsService } from './support-contacts.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/support-contacts')
export class SupportContactsController {
  constructor(private readonly svc: SupportContactsService) {}

  @Get()
  getAll() {
    return this.svc.getAll();
  }

  @Post()
  create(@Body() body: { type: string; value: string; label?: string; isActive?: boolean }) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { type?: string; value?: string; label?: string; isActive?: boolean }) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
