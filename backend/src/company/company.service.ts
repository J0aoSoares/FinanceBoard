import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    try {
      return await this.prisma.company.create({ data: dto });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  findAll() {
    return this.prisma.company.findMany({ orderBy: { legalName: 'asc' } });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    try {
      return await this.prisma.company.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.company.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private translateWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Já existe uma empresa cadastrada com esse CNPJ',
        );
      }
      if (error.code === 'P2003') {
        return new ConflictException(
          'Não é possível remover esta empresa: existem contas, faturas ou recebíveis vinculados a ela',
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Empresa não encontrada');
      }
    }
    return error;
  }
}
