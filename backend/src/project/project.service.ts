import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nameKey } from '../common/name-key.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProjectDto) {
    return this.prisma.project
      .create({ data: { ...dto, nameKey: nameKey(dto.name) } })
      .catch((error: unknown) => {
        throw this.translateWriteError(error);
      });
  }

  findAll(query: ListProjectsQueryDto) {
    return this.prisma.project.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Obra não encontrada');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      return await this.prisma.project.update({
        where: { id },
        data:
          dto.name === undefined ? dto : { ...dto, nameKey: nameKey(dto.name) },
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    const counts = await Promise.all([
      this.prisma.bill.count({ where: { projectId: id } }),
      this.prisma.receivable.count({ where: { projectId: id } }),
      this.prisma.projectBilling.count({ where: { projectId: id } }),
      this.prisma.retainageRelease.count({ where: { projectId: id } }),
    ]);
    if (counts.some((count) => count > 0)) {
      throw new ConflictException(
        'Não é possível remover esta obra: existem boletos, contas a receber, faturas ou devoluções de caução vinculados a ela. Encerre a obra em vez de removê-la',
      );
    }

    try {
      await this.prisma.project.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private translateWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Já existe uma obra com esse nome');
      }
      if (error.code === 'P2003') {
        return new ConflictException(
          'Não é possível remover esta obra: existem boletos, contas a receber, faturas ou devoluções de caução vinculados a ela',
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Obra não encontrada');
      }
    }
    return error;
  }
}
