import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { ProjectModule } from './project/project.module';
import { SupplierModule } from './supplier/supplier.module';
import { CategoryModule } from './category/category.module';
import { BillModule } from './bill/bill.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ReceivableModule } from './receivable/receivable.module';
import { ReportModule } from './report/report.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    CompanyModule,
    ProjectModule,
    SupplierModule,
    CategoryModule,
    BillModule,
    InvoiceModule,
    ReceivableModule,
    ReportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
