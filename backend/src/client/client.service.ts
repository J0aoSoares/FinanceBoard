import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { onlyDigits } from '../common/br-document.util';
import { nameKey } from '../common/name-key.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CLIENT_NOT_FOUND,
  createClient,
  translateClientWriteError,
  updateClient,
} from './client-writer';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const contactOrder = [
  { isPrimary: 'desc' },
  { name: 'asc' },
] satisfies Prisma.ClientContactOrderByWithRelationInput[];

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    try {
      const client = await this.prisma.$transaction((tx) =>
        createClient(tx, dto),
      );
      return this.findOne(client.id);
    } catch (error) {
      throw translateClientWriteError(error) ?? error;
    }
  }

  async findAll(query: ListClientsQueryDto) {
    const search = query.search?.trim() ?? '';
    const digits = onlyDigits(search);
    const where: Prisma.ClientWhereInput =
      search === ''
        ? {}
        : {
            OR: [
              { nameKey: { contains: nameKey(search) } },
              { name: { contains: search, mode: 'insensitive' } },
              { tradeName: { contains: search, mode: 'insensitive' } },
              ...(digits === '' ? [] : [{ document: { contains: digits } }]),
            ],
          };

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        contacts: { orderBy: contactOrder },
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    });
    return clients.map(({ _count, ...client }) => ({
      ...client,
      projectCount: _count.projects,
      primaryContact:
        client.contacts.find((contact) => contact.isPrimary) ??
        client.contacts[0] ??
        null,
    }));
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: contactOrder },
        projects: {
          select: { id: true, name: true, status: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!client) {
      throw new NotFoundException(CLIENT_NOT_FOUND);
    }
    return { ...client, projectCount: client.projects.length };
  }

  async update(id: string, dto: UpdateClientDto) {
    try {
      await this.prisma.$transaction((tx) => updateClient(tx, id, dto));
      return this.findOne(id);
    } catch (error) {
      throw translateClientWriteError(error) ?? error;
    }
  }

  async remove(id: string) {
    const projectCount = await this.prisma.project.count({
      where: { clientId: id },
    });
    if (projectCount > 0) {
      throw new ConflictException(
        `Não é possível excluir este cliente: existem ${projectCount} ${projectCount === 1 ? 'obra vinculada' : 'obras vinculadas'} a ele`,
      );
    }
    try {
      await this.prisma.client.delete({ where: { id } });
    } catch (error) {
      throw translateClientWriteError(error) ?? error;
    }
  }
}
