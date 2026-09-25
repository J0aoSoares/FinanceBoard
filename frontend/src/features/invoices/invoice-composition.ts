import type { Bill, UpdateInvoiceInput } from '../../api/types';
import { subtractMoney, sumMoney, type Money } from '../../lib/money';

export interface EligibilityContext {
  companyId: string;
  invoiceId?: string;
}

export type IneligibilityReason =
  'OTHER_COMPANY' | 'OTHER_INVOICE' | 'PAID_WITHOUT_INVOICE';

const REASON_LABELS: Record<IneligibilityReason, string> = {
  OTHER_COMPANY: 'Pertence a outra empresa',
  OTHER_INVOICE: 'Já pertence a outra fatura',
  PAID_WITHOUT_INVOICE: 'Já foi paga fora de fatura',
};

export function ineligibilityReason(
  bill: Bill,
  context: EligibilityContext,
): IneligibilityReason | null {
  if (bill.companyId !== context.companyId) {
    return 'OTHER_COMPANY';
  }
  if (bill.invoiceId !== null && bill.invoiceId !== context.invoiceId) {
    return 'OTHER_INVOICE';
  }
  if (bill.status === 'PAID' && bill.invoiceId === null) {
    return 'PAID_WITHOUT_INVOICE';
  }
  return null;
}

export function ineligibilityLabel(reason: IneligibilityReason): string {
  return REASON_LABELS[reason];
}

export function isBillEligible(bill: Bill, context: EligibilityContext) {
  return ineligibilityReason(bill, context) === null;
}

export function eligibleBills(bills: Bill[], context: EligibilityContext) {
  return bills.filter((bill) => isBillEligible(bill, context));
}

export function addBill(selectedIds: string[], billId: string): string[] {
  return [...new Set([...selectedIds, billId])];
}

export function removeBill(selectedIds: string[], billId: string): string[] {
  return selectedIds.filter((id) => id !== billId);
}

export function toggleBill(selectedIds: string[], billId: string): string[] {
  return selectedIds.includes(billId)
    ? removeBill(selectedIds, billId)
    : addBill(selectedIds, billId);
}

export interface SelectionTotals {
  count: number;
  grossTotal: Money;
  netTotal: Money;
  withholdingTotal: Money;
}

export function selectionTotals(
  bills: Bill[],
  selectedIds: string[],
): SelectionTotals {
  const selected = new Set(selectedIds);
  const chosen = bills.filter((bill) => selected.has(bill.id));
  const grossTotal = sumMoney(chosen.map((bill) => bill.grossAmount));
  const netTotal = sumMoney(chosen.map((bill) => bill.netAmount));

  return {
    count: chosen.length,
    grossTotal,
    netTotal,
    withholdingTotal: subtractMoney(grossTotal, netTotal),
  };
}

export function buildCompositionPayload(
  selectedIds: string[],
): UpdateInvoiceInput {
  return { billIds: [...new Set(selectedIds)] };
}
