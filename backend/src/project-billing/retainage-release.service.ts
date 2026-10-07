import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRetainageReleaseDto } from './dto/create-retainage-release.dto';
import { assertNotFuture } from './project-billing.service';
import {
  CONCURRENT_UPDATE,
  SERIALIZABLE,
  isSerializationFailure,
  retainageBalance,
} from './retainage-balance';

const releaseInclude = {
  company: true,
  bank: true,
} satisfies Prisma.RetainageReleaseInclude;

type ReleaseWithRelations = Prisma.RetainageReleaseGetPayload<{
  include: typeof releaseInclude;
}>;

type CompanyTotals = {
  legalName: string;
  withheld: Prisma.Decimal;
  released: Prisma.Decimal;
};

const NOT_FOUND = 'Devolução de caução não encontrada';

@Injectable()
export class RetainageReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRetainageReleaseDto) {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException(
        'Valor da devolução deve ser maior que zero',
      );
    }
    assertNotFuture(dto.returnDate, 'Data da devolução não pode ser futura');

    try {
      const release = await this.prisma.$transaction(async (tx) => {
        const { balance } = await retainageBalance(tx, {
          projectId: dto.projectId,
          companyId: dto.companyId,
        });
        if (amount.gt(balance)) {
          throw new BadRequestException(
            `Devolução maior que o saldo de caução retido desta obra nesta empresa (saldo: ${balance.toFixed(2)})`,
          );
        }
        return tx.retainageRelease.create({
          data: {
            projectId: dto.projectId,
            companyId: dto.companyId,
            amount,
            returnDate: new Date(dto.returnDate),
            bankId: dto.bankId,
          },
          include: releaseInclude,
        });
      }, SERIALIZABLE);
      return this.toResponse(release);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async listByProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Obra não encontrada');
    }

    const [billings, releases] = await Promise.all([
      this.prisma.projectBilling.findMany({
        where: { projectId },
        select: { retainageAmount: true, company: true },
      }),
      this.prisma.retainageRelease.findMany({
        where: { projectId },
        include: releaseInclude,
        orderBy: [{ returnDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const zero = () => new Prisma.Decimal(0);
    const companies = new Map<string, CompanyTotals>();
    const companyEntry = (company: { id: string; legalName: string }) => {
      const entry = companies.get(company.id) ?? {
        legalName: company.legalName,
        withheld: zero(),
        released: zero(),
      };
      companies.set(company.id, entry);
      return entry;
    };
    for (const billing of billings) {
      if (billing.retainageAmount.gt(0)) {
        const entry = companyEntry(billing.company);
        entry.withheld = entry.withheld.plus(billing.retainageAmount);
      }
    }
    for (const release of releases) {
      const entry = companyEntry(release.company);
      entry.released = entry.released.plus(release.amount);
    }

    const entries = [...companies.values()];
    const withheld = entries.reduce(
      (acc, entry) => acc.plus(entry.withheld),
      zero(),
    );
    const released = entries.reduce(
      (acc, entry) => acc.plus(entry.released),
      zero(),
    );

    return {
      projectId,
      withheld: withheld.toFixed(2),
      released: released.toFixed(2),
      balance: withheld.minus(released).toFixed(2),
      companies: [...companies.entries()]
        .sort((a, b) => a[1].legalName.localeCompare(b[1].legalName, 'pt-BR'))
        .map(([companyId, entry]) => ({
          companyId,
          legalName: entry.legalName,
          withheld: entry.withheld.toFixed(2),
          released: entry.released.toFixed(2),
          balance: entry.withheld.minus(entry.released).toFixed(2),
        })),
      releases: releases.map((release) => this.toResponse(release)),
    };
  }

  async remove(id: string) {
    try {
      await this.prisma.retainageRelease.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private toResponse(release: ReleaseWithRelations) {
    return { ...release, amount: release.amount.toFixed(2) };
  }

  private translateWriteError(error: unknown) {
    if (isSerializationFailure(error)) {
      return new ConflictException(CONCURRENT_UPDATE);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        const field = String(error.meta?.field_name ?? '');
        if (field.includes('companyId')) {
          return new BadRequestException('Empresa informada não existe');
        }
        if (field.includes('projectId')) {
          return new BadRequestException('Obra informada não existe');
        }
        if (field.includes('bankId')) {
          return new BadRequestException('Banco informado não existe');
        }
        return new BadRequestException('Registro relacionado não existe');
      }
      if (error.code === 'P2025') {
        return new NotFoundException(NOT_FOUND);
      }
    }
    return error;
  }
}
