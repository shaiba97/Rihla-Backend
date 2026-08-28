import { Controller, Get, Post, Param, Req, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Prisma } from '@app/prisma';
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

  @Get('earnings')
  getEarnings(@Req() req: any) {
    return this.svc.getTotalEarnings(req.user.id);
  }

  @Post('withdraw')
  async createWithdraw(
    @Req() req: any,
    @Body() body: { bankName: string; accountHolder: string; accountNumber: string; amount: number },
  ) {
    if (!body.bankName || !body.accountHolder || !body.accountNumber) {
      throw new BadRequestException('جميع حقول معلومات الحساب مطلوبة');
    }
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('المبلغ المطلوب غير صحيح');
    }
    try {
      return await this.svc.createWithdrawRequest(req.user.id, body);
    } catch (error) {
      console.error('[awards/withdraw] error:', {
        name: error?.name,
        code: (error as any)?.code,
        message: (error as any)?.message,
        meta: (error as any)?.meta,
      });
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('طلب سحب بنفس البيانات موجود بالفعل');
        }
        throw new BadRequestException(`خطأ في قاعدة البيانات (${error.code}) — يرجى المحاولة مجدداً`);
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('بيانات غير صالحة — يرجى التحقق من المدخلات');
      }
      throw error;
    }
  }

  @Get('withdrawals')
  getWithdrawals(@Req() req: any) {
    return this.svc.getWithdrawals(req.user.id);
  }
}
