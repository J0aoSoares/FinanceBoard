import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nameKey } from '../common/name-key.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: { ...dto, nameKey: nameKey(dto.name) },
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  findAll() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data:
          dto.name === undefined ? dto : { ...dto, nameKey: nameKey(dto.name) },
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.supplier.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private translateWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Já existe um fornecedor com esse nome');
      }
      if (error.code === 'P2003') {
        return new ConflictException(
          'Não é possível remover este fornecedor: existem contas ou faturas vinculadas a ele',
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Fornecedor não encontrado');
      }
    }
    return error;
  }
}
