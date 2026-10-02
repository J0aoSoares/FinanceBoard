import type { Money } from '../lib/money';

export type PaymentStatus = 'PENDING' | 'PAID';
export type EffectiveStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type ProjectStatus = 'ACTIVE' | 'CLOSED';
export type Regime = 'accrual' | 'cash';
export type TaxType = 'INSS' | 'ISS' | 'IRRF' | 'PIS_COFINS_CSLL';

export interface Company {
  id: string;
  legalName: string;
  cnpj: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
}

export interface TaxWithholding {
  id: string;
  billId: string;
  type: TaxType;
  amount: Money;
}

export interface BillGroupSummary {
  id: string;
  position: number;
  billCount: number;
  paidCount: number;
  totalAmount: Money;
}

export interface Bill {
  id: string;
  documentNumber: string;
  description: string;
  digitableLine: string | null;
  installmentLabel: string | null;
  installmentNumber: number | null;
  groupId: string | null;
  group: BillGroupSummary | null;
  grossAmount: Money;
  netAmount: Money;
  issueDate: string;
  dueDate: string;
  paymentDate: string | null;
  status: PaymentStatus;
  hasTaxWithholding: boolean;
  companyId: string;
  projectId: string | null;
  categoryId: string;
  supplierId: string;
  company: Company;
  project: Project | null;
  category: Category;
  supplier: Supplier;
  taxWithholdings: TaxWithholding[];
  effectiveStatus: EffectiveStatus;
  effectiveDueDate: string;
}

export interface BillFieldsInput {
  documentNumber: string;
  description: string;
  issueDate: string;
  companyId: string;
  projectId?: string;
  categoryId: string;
  supplierId: string;
}

export interface CreateBillInput extends BillFieldsInput {
  amount: Money;
  dueDate: string;
  digitableLine?: string;
  paymentDate?: string;
}

export type UpdateBillInput = Partial<
  Omit<CreateBillInput, 'projectId' | 'digitableLine' | 'paymentDate'>
> & {
  projectId?: string | null;
  digitableLine?: string | null;
};

export interface InstallmentInput {
  label: string;
  dueDate: string;
  amount: Money;
  digitableLine?: string;
  paymentDate?: string;
}

export interface CreateInstallmentsInput extends BillFieldsInput {
  totalAmount?: Money;
  installments: InstallmentInput[];
}

export type BillDateBasis = 'issue' | 'due' | 'payment';

export interface BillFilters {
  companyId?: string;
  projectId?: string;
  categoryId?: string;
  supplierId?: string;
  status?: EffectiveStatus;
  month?: string;
  regime?: Regime;
  dateBasis?: BillDateBasis;
}

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  INSS: 'INSS',
  ISS: 'ISS',
  IRRF: 'IRRF',
  PIS_COFINS_CSLL: 'PIS/COFINS/CSLL',
};

export const TAX_TYPES: TaxType[] = ['INSS', 'ISS', 'IRRF', 'PIS_COFINS_CSLL'];

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
};

export interface CreateCompanyInput {
  legalName: string;
  cnpj: string;
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export interface CreateProjectInput {
  name: string;
  clientName: string;
  status?: ProjectStatus;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface CreateSupplierInput {
  name: string;
  document?: string;
}

export type UpdateSupplierInput = Partial<
  Omit<CreateSupplierInput, 'document'>
> & {
  document?: string | null;
};

export interface CreateCategoryInput {
  name: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface ProjectFilters {
  status?: ProjectStatus;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Ativa',
  CLOSED: 'Encerrada',
};

export const PROJECT_STATUSES: ProjectStatus[] = ['ACTIVE', 'CLOSED'];

export interface ReceivableWithholding {
  id: string;
  receivableId: string;
  type: TaxType;
  amount: Money;
}

export interface Receivable {
  id: string;
  number: string | null;
  description: string;
  clientName: string;
  grossAmount: Money;
  netAmount: Money;
  withholdingTotal: Money;
  competence: string;
  issueDate: string;
  dueDate: string;
  receiptDate: string | null;
  status: PaymentStatus;
  companyId: string;
  projectId: string | null;
  company: Company;
  project: Project | null;
  withholdings: ReceivableWithholding[];
  effectiveStatus: EffectiveStatus;
}

export interface WithholdingInput {
  type: TaxType;
  amount: Money;
}

export interface CreateReceivableInput {
  number: string;
  description: string;
  clientName: string;
  grossAmount: Money;
  competence: string;
  issueDate: string;
  dueDate: string;
  companyId: string;
  projectId?: string | null;
  withholdings: WithholdingInput[];
}

export type UpdateReceivableInput = Partial<CreateReceivableInput>;

export type ReceivableDateBasis = 'competence' | 'issue' | 'receipt';

export interface ReceivableFilters {
  companyId?: string;
  projectId?: string;
  clientName?: string;
  status?: EffectiveStatus;
  month?: string;
  regime?: Regime;
  dateBasis?: ReceivableDateBasis;
}

export interface ProjectBillingSummary {
  projectId: string;
  invoiceCount: number;
  receivedCount: number;
  grossInvoiced: Money;
  withholdingTotal: Money;
  netInvoiced: Money;
  received: Money;
  outstanding: Money;
}

export interface ReportPeriodFilters {
  from: string;
  to: string;
  regime?: Regime;
  companyId?: string;
  projectId?: string;
}

interface ReportEcho {
  regime: Regime;
  from: string;
  to: string;
  consolidated: boolean;
}

export interface CashflowMonth {
  month: string;
  inflow: Money;
  inflowGross: Money;
  inflowWithholdings: Money;
  outflow: Money;
  balance: Money;
  accumulatedBalance: Money;
}

export interface CashflowTotals {
  inflow: Money;
  inflowGross: Money;
  inflowWithholdings: Money;
  outflow: Money;
  balance: Money;
}

export interface CashflowReport extends ReportEcho {
  months: CashflowMonth[];
  totals: CashflowTotals;
}

export interface WithholdingByType {
  type: TaxType;
  amount: Money;
}

export interface WithholdingGroup {
  invoiceCount: number;
  total: Money;
  byType: WithholdingByType[];
}

export interface WithholdingCompany extends WithholdingGroup {
  companyId: string;
  legalName: string;
  cnpj: string;
}

export interface WithholdingProject extends WithholdingGroup {
  projectId: string | null;
  name: string;
}

export interface WithholdingInvoiceDetail {
  id: string;
  number: string | null;
  companyId: string;
  legalName: string;
  cnpj: string;
  projectId: string | null;
  projectName: string | null;
  clientName: string;
  competence: string;
  issueDate: string;
  receiptDate: string | null;
  grossAmount: Money;
  withholdingTotal: Money;
  netAmount: Money;
  amountsByType: Record<TaxType, Money>;
}

export interface LegacyWithholdingBill {
  id: string;
  documentNumber: string;
  companyId: string;
  legalName: string;
  cnpj: string;
  supplierName: string;
  referenceDate: string | null;
  grossAmount: Money;
  withholdingTotal: Money;
  netAmount: Money;
  amountsByType: Record<TaxType, Money>;
}

export interface WithholdingReport extends ReportEcho {
  companies: WithholdingCompany[];
  projects: WithholdingProject[];
  invoices: WithholdingInvoiceDetail[];
  totals: WithholdingGroup & { grossAmount: Money; netAmount: Money };
  legacy: {
    bills: LegacyWithholdingBill[];
    totals: { billCount: number; total: Money; byType: WithholdingByType[] };
  };
}

export interface ProjectRevenue {
  invoiceCount: number;
  grossAmount: Money;
  withholdingTotal: Money;
  netAmount: Money;
}

export interface ProjectCostCategory {
  categoryId: string;
  name: string;
  billCount: number;
  total: Money;
}

export interface ProjectCost {
  billCount: number;
  total: Money;
  byCategory: ProjectCostCategory[];
}

export interface ProjectResultEntry {
  projectId: string | null;
  name: string;
  clientName: string | null;
  status: ProjectStatus | null;
  revenue: ProjectRevenue;
  received: Money;
  outstanding: Money;
  cost: ProjectCost;
  result: Money;
}

export interface ProjectResultReport extends ReportEcho {
  projects: ProjectResultEntry[];
  administrative: ProjectCost;
  unassignedRevenue: {
    revenue: ProjectRevenue;
    received: Money;
    outstanding: Money;
  } | null;
  totals: {
    revenue: ProjectRevenue;
    received: Money;
    outstanding: Money;
    projectCost: Money;
    administrativeCost: Money;
    cost: Money;
    result: Money;
  };
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordInput {
  newPassword: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  VIEWER: 'Somente leitura',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Acesso total, incluindo a gestão de usuários',
  OPERATOR: 'Cria e edita lançamentos, registra e estorna pagamentos',
  VIEWER: 'Somente leitura — pensado para contabilidade e auditoria',
};

export const USER_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'VIEWER'];
