import { Controller, Get } from '@nestjs/common';

@Controller()
export class AdminController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
