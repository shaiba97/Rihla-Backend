import { Module } from '@nestjs/common'; import { PrismaModule } from '@app/prisma'; import { ExpenseController } from './expense.controller'; import { ExpenseService } from './expense.service';
@Module({ imports: [PrismaModule], controllers: [ExpenseController], providers: [ExpenseService] })
export class ExpenseModule {}
