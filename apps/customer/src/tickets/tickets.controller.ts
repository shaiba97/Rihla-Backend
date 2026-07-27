import { Controller, Get, Param, Query, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/prisma';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('html/:id')
  async getTicketHtml(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) throw new UnauthorizedException('Token is required');

    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET! });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { TicketPDF: true, Trip: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== payload.id) throw new UnauthorizedException('Not your ticket');

    const ticketPdf = booking.TicketPDF;
    if (!ticketPdf?.ticketUrl) throw new NotFoundException('No ticket available');

    const filePath = path.join(__dirname, '../../../upload', path.basename(ticketPdf.ticketUrl));
    if (!fs.existsSync(filePath)) throw new NotFoundException('Ticket file not found');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="ticket.pdf"');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
