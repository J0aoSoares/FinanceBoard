import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bank.findMany({ orderBy: { name: 'asc' } });
  }
}
