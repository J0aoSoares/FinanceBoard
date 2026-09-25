import { formatCurrency, formatMoney, type Money } from '../../lib/money';
import classes from './MoneyText.module.css';

type Tone = 'default' | 'muted' | 'inflow' | 'outflow';

interface MoneyTextProps {
  value: Money | null | undefined;
  tone?: Tone;
  strong?: boolean;
  withSymbol?: boolean;
}

const toneClass: Record<Tone, string> = {
  default: '',
  muted: classes.muted,
  inflow: classes.inflow,
  outflow: classes.outflow,
};

export function MoneyText({
  value,
  tone = 'default',
  strong = false,
  withSymbol = false,
}: MoneyTextProps) {
  const className = [
    classes.value,
    toneClass[tone],
    strong ? classes.strong : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className}>
      {withSymbol ? formatCurrency(value) : formatMoney(value)}
    </span>
  );
}
