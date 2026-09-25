const COMBINING_MARKS = /[̀-ͯ]/g;

export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
