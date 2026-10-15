export function documentNumberKey(value: string): string {
  const compact = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const withoutPrefix = compact.replace(/^NF(E|S|SE)?(?=\d)/, '');
  const withoutZeros = withoutPrefix.replace(/^0+(?=\d)/, '');
  return withoutZeros;
}
