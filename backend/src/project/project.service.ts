import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  createClient,
  createContact,
  translateClientWriteError,
  updateClient,
} from '../client/client-writer';
import { onlyDigits, zipCodeError } from '../common/br-document.util';
import { nameKey } from '../common/name-key.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export const projectInclude = {
  client: {
    select: {
      id: true,
      personType: true,
      name: true,
      tradeName: true,
      document: true,
      phone: true,
      email: true,
    },
  },
  referenceContact: true,
} satisfies Prisma.ProjectInclude;

const NOT_FOUND = 'Obra não encontrada';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    if (!dto.clientId && !dto.client) {
      throw new BadRequestException('Cliente da obra é obrigatório');
    }
    this.assertExclusiveFields(dto);

    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const clientId = await this.resolveClient(tx, dto, null);
        const referenceContactId = await this.resolveReferenceContact(
          tx,
          dto,
          clientId,
          false,
        );
        return tx.project.create({
          data: {
            name: dto.name,
            nameKey: nameKey(dto.name),
            status: dto.status,
            clientId,
            referenceContactId: referenceContactId ?? null,
            ...this.detailFields(dto, null),
          },
          include: projectInclude,
        });
      });
      return project;
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  findAll(query: ListProjectsQueryDto) {
    return this.prisma.project.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: projectInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundException(NOT_FOUND);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    this.assertExclusiveFields(dto);
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
    const details = this.detailFields(dto, existing);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const clientId = await this.resolveClient(tx, dto, existing.clientId);
        const clientChanged = clientId !== existing.clientId;
        const referenceContactId = await this.resolveReferenceContact(
          tx,
          dto,
          clientId,
          clientChanged,
        );
        return tx.project.update({
          where: { id },
          data: {
            name: dto.name,
            nameKey: dto.name === undefined ? undefined : nameKey(dto.name),
            status: dto.status,
            clientId: clientChanged ? clientId : undefined,
            referenceContactId,
            ...details,
          },
          include: projectInclude,
        });
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

  private detailFields(
    dto: UpdateProjectDto,
    existing: { startDate: Date | null; expectedEndDate: Date | null } | null,
  ) {
    const toDate = (value: string | null | undefined) =>
      value === undefined ? undefined : value === null ? null : new Date(value);
    const startDate = toDate(dto.startDate);
    const expectedEndDate = toDate(dto.expectedEndDate);
    const start = startDate === undefined ? existing?.startDate : startDate;
    const end =
      expectedEndDate === undefined
        ? existing?.expectedEndDate
        : expectedEndDate;
    if (start && end && end < start) {
      throw new BadRequestException(
        'Previsão de término não pode ser anterior à data de início',
      );
    }

    let zipCode = dto.zipCode;
    if (zipCode) {
      const error = zipCodeError(zipCode);
      if (error) {
        throw new BadRequestException(`${error.replace('CEP', 'CEP da obra')}`);
      }
      zipCode = onlyDigits(zipCode);
    }

    return {
      contractNumber: dto.contractNumber,
      startDate,
      expectedEndDate,
      zipCode,
      street: dto.street,
      streetNumber: dto.streetNumber,
      complement: dto.complement,
      district: dto.district,
      city: dto.city,
      state: dto.state,
      details: dto.details,
    };
  }

  private assertExclusiveFields(dto: UpdateProjectDto) {
    if (dto.clientId && dto.client) {
      throw new BadRequestException(
        'Informe um cliente existente ou os dados de um cliente novo, não os dois',
      );
    }
    if (dto.clientChanges && !dto.clientId) {
      throw new BadRequestException(
        'Alterações de cliente exigem o cliente existente selecionado',
      );
    }
    if (dto.referenceContactId && dto.newReferenceContact) {
      throw new BadRequestException(
        'Informe um contato existente ou um contato novo, não os dois',
      );
    }
  }

  private async resolveClient(
    tx: Prisma.TransactionClient,
    dto: UpdateProjectDto,
    currentClientId: string | null,
  ) {
    if (dto.client) {
      return (await createClient(tx, dto.client)).id;
    }
    const clientId = dto.clientId ?? currentClientId;
    if (!clientId) {
      throw new BadRequestException('Cliente da obra é obrigatório');
    }
    if (dto.clientId) {
      const exists = await tx.client.count({ where: { id: dto.clientId } });
      if (exists === 0) {
        throw new BadRequestException('Cliente informado não existe');
      }
    }
    if (dto.clientChanges) {
      await updateClient(tx, clientId, dto.clientChanges);
    }
    return clientId;
  }

  private async resolveReferenceContact(
    tx: Prisma.TransactionClient,
    dto: UpdateProjectDto,
    clientId: string,
    clientChanged: boolean,
  ) {
    if (dto.newReferenceContact) {
      return (await createContact(tx, clientId, dto.newReferenceContact)).id;
    }
    if (dto.referenceContactId) {
      const contact = await tx.clientContact.findUnique({
        where: { id: dto.referenceContactId },
      });
      if (!contact || contact.clientId !== clientId) {
        throw new BadRequestException(
          'O contato de referência precisa ser um contato do cliente da obra',
        );
      }
      return contact.id;
    }
    if (dto.referenceContactId === null || clientChanged) {
      return null;
    }
    return undefined;
  }

  private translateWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = String(error.meta?.target ?? '');
        if (target.includes('nameKey') && !target.includes('client')) {
          return new ConflictException('Já existe uma obra com esse nome');
        }
      }
      if (error.code === 'P2003') {
        return new ConflictException(
          'Não é possível remover esta obra: existem boletos, contas a receber, faturas ou devoluções de caução vinculados a ela',
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException(NOT_FOUND);
      }
    }
    return translateClientWriteError(error) ?? error;
  }
}
