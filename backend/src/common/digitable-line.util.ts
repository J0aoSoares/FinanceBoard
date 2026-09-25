const ALLOWED_CHARACTERS = /^[\d.\s]+$/;
const BANK_SLIP_LENGTH = 47;
const COLLECTION_LENGTH = 48;
const ORDINALS = ['1º', '2º', '3º', '4º'];

export function normalizeDigitableLine(value: string): string {
  return value.replace(/[.\s]/g, '');
}

function mod10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let index = digits.length - 1; index >= 0; index--) {
    const product = Number(digits[index]) * weight;
    sum += Math.floor(product / 10) + (product % 10);
    weight = weight === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

function weightedMod11Sum(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let index = digits.length - 1; index >= 0; index--) {
    sum += Number(digits[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  return sum;
}

function bankSlipMod11(digits: string): number {
  const result = 11 - (weightedMod11Sum(digits) % 11);
  return result === 0 || result === 10 || result === 11 ? 1 : result;
}

function collectionMod11(digits: string): number {
  const rest = weightedMod11Sum(digits) % 11;
  if (rest === 0 || rest === 1) {
    return 0;
  }
  if (rest === 10) {
    return 1;
  }
  return 11 - rest;
}

function bankSlipError(line: string): string | null {
  const fields = [
    { body: line.slice(0, 9), check: line[9] },
    { body: line.slice(10, 20), check: line[20] },
    { body: line.slice(21, 31), check: line[31] },
  ];
  for (const [index, field] of fields.entries()) {
    if (mod10(field.body) !== Number(field.check)) {
      return `Linha digitável inválida: dígito verificador do ${ORDINALS[index]} campo não confere`;
    }
  }

  const barcode =
    line.slice(0, 4) +
    line[32] +
    line.slice(33, 47) +
    line.slice(4, 9) +
    line.slice(10, 20) +
    line.slice(21, 31);
  const withoutGeneralCheck = barcode.slice(0, 4) + barcode.slice(5);
  if (bankSlipMod11(withoutGeneralCheck) !== Number(barcode[4])) {
    return 'Linha digitável inválida: dígito verificador geral não confere';
  }
  return null;
}

function collectionError(line: string): string | null {
  if (line[0] !== '8') {
    return 'Linha digitável de arrecadação deve começar com 8';
  }
  const valueType = line[2];
  const checker =
    valueType === '6' || valueType === '7'
      ? mod10
      : valueType === '8' || valueType === '9'
        ? collectionMod11
        : null;
  if (!checker) {
    return 'Linha digitável inválida: o 3º dígito deve ser 6, 7, 8 ou 9';
  }

  const blocks = [0, 1, 2, 3].map((index) => ({
    body: line.slice(index * 12, index * 12 + 11),
    check: line[index * 12 + 11],
  }));
  for (const [index, block] of blocks.entries()) {
    if (checker(block.body) !== Number(block.check)) {
      return `Linha digitável inválida: dígito verificador do ${ORDINALS[index]} bloco não confere`;
    }
  }

  const barcode = blocks.map((block) => block.body).join('');
  const withoutGeneralCheck = barcode.slice(0, 3) + barcode.slice(4);
  if (checker(withoutGeneralCheck) !== Number(barcode[3])) {
    return 'Linha digitável inválida: dígito verificador geral não confere';
  }
  return null;
}

export function digitableLineError(value: string): string | null {
  if (!ALLOWED_CHARACTERS.test(value)) {
    return 'Linha digitável deve conter apenas números, espaços e pontos';
  }
  const line = normalizeDigitableLine(value);
  if (line.length === BANK_SLIP_LENGTH) {
    return bankSlipError(line);
  }
  if (line.length === COLLECTION_LENGTH) {
    return collectionError(line);
  }
  return `Linha digitável deve ter 47 dígitos (boleto bancário) ou 48 (arrecadação); foram informados ${line.length}`;
}
