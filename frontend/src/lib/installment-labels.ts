export type LabelPattern = 'numeric' | 'alpha' | 'manual';

export const LABEL_PATTERN_OPTIONS: { value: LabelPattern; label: string }[] = [
  { value: 'numeric', label: '1, 2, 3…' },
  { value: 'alpha', label: 'A, B, C…' },
  { value: 'manual', label: 'Manual' },
];

export function alphaLabel(index: number): string {
  let remaining = index + 1;
  let label = '';
  while (remaining > 0) {
    const letter = (remaining - 1) % 26;
    label = String.fromCharCode(65 + letter) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return label;
}

export function installmentLabels(
  pattern: LabelPattern,
  count: number,
  previous: string[] = [],
): string[] {
  return Array.from({ length: count }, (_, index) => {
    if (pattern === 'numeric') {
      return String(index + 1);
    }
    if (pattern === 'alpha') {
      return alphaLabel(index);
    }
    return previous[index] ?? '';
  });
}

export function duplicatedLabels(labels: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const label of labels) {
    const key = label.trim().toLocaleUpperCase('pt-BR');
    if (key === '') {
      continue;
    }
    if (seen.has(key)) {
      duplicated.add(key);
    }
    seen.add(key);
  }
  return duplicated;
}
