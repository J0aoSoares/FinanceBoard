import type { Project, ProjectDetailsInput } from '../../api/types.ts';
import { formatZipCode, zipCodeError } from '../../lib/contact-format.ts';
import { apiDate } from '../../lib/date.ts';
import { onlyDigits } from '../../lib/document.ts';
import type { AddressValues } from '../../components/fields/AddressFields.tsx';

export interface ProjectDetailsValues extends AddressValues {
  contractNumber: string;
  startDate: string | null;
  expectedEndDate: string | null;
  details: string;
}

export const emptyProjectDetails = (): ProjectDetailsValues => ({
  contractNumber: '',
  startDate: null,
  expectedEndDate: null,
  zipCode: '',
  street: '',
  streetNumber: '',
  complement: '',
  district: '',
  city: '',
  state: null,
  details: '',
});

export const projectToDetails = (project: Project): ProjectDetailsValues => ({
  contractNumber: project.contractNumber ?? '',
  startDate: apiDate(project.startDate),
  expectedEndDate: apiDate(project.expectedEndDate),
  zipCode: formatZipCode(project.zipCode),
  street: project.street ?? '',
  streetNumber: project.streetNumber ?? '',
  complement: project.complement ?? '',
  district: project.district ?? '',
  city: project.city ?? '',
  state: project.state,
  details: project.details ?? '',
});

export function validateProjectDetails(
  values: ProjectDetailsValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.zipCode.trim() !== '') {
    const error = zipCodeError(values.zipCode);
    if (error) {
      errors.zipCode = error;
    }
  }
  if (
    values.startDate &&
    values.expectedEndDate &&
    values.expectedEndDate < values.startDate
  ) {
    errors.expectedEndDate = 'Previsão de término anterior ao início';
  }
  return errors;
}

type Mode = 'create' | 'update';

function optional(value: string, mode: Mode) {
  const text = value.trim();
  if (text === '') {
    return mode === 'update' ? null : undefined;
  }
  return text;
}

const optionalDate = (value: string | null, mode: Mode) =>
  value ?? (mode === 'update' ? null : undefined);

export function projectDetailsInput(
  values: ProjectDetailsValues,
  mode: Mode,
): ProjectDetailsInput {
  const zip = optional(values.zipCode, mode);
  const input: ProjectDetailsInput = {
    contractNumber: optional(values.contractNumber, mode),
    startDate: optionalDate(values.startDate, mode),
    expectedEndDate: optionalDate(values.expectedEndDate, mode),
    zipCode: zip ? onlyDigits(zip) : zip,
    street: optional(values.street, mode),
    streetNumber: optional(values.streetNumber, mode),
    complement: optional(values.complement, mode),
    district: optional(values.district, mode),
    city: optional(values.city, mode),
    state: values.state ?? (mode === 'update' ? null : undefined),
    details: optional(values.details, mode),
  };
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as ProjectDetailsInput;
}

export function projectAddress(project: Project): string {
  return [
    [project.street, project.streetNumber].filter(Boolean).join(', '),
    project.complement,
    project.district,
    [project.city, project.state].filter(Boolean).join(' / '),
    formatZipCode(project.zipCode),
  ]
    .filter(Boolean)
    .join(' · ');
}
