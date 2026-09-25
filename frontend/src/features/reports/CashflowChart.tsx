import { useElementSize } from '@mantine/hooks';
import { useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import { formatMonth, monthNumberOf, shortMonthLabels } from '../../lib/date';
import { formatMoney, fromCents, toSignedCents } from '../../lib/money';
import type { CashflowMonth } from '../../api/types';
import classes from './CashflowChart.module.css';

export type OutflowMode = 'net' | 'gross';

interface CashflowChartProps {
  months: CashflowMonth[];
  outflowMode: OutflowMode;
}

const HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 40, left: 96 };
const MAX_BAR_WIDTH = 18;
const BAR_GAP = 2;
const TICK_COUNT = 5;

const axisLabel = (cents: number) =>
  formatMoney(fromCents(cents)).replace(',00', '');

function niceStep(span: number, count: number): number {
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function buildScale(values: number[]) {
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = rawMax - rawMin;

  if (span === 0) {
    return { min: 0, max: 100000, ticks: [0, 25000, 50000, 75000, 100000] };
  }

  const step = niceStep(span, TICK_COUNT);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;

  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) {
    ticks.push(Math.round(tick));
  }
  return { min, max, ticks };
}

function barPath(x: number, y: number, width: number, height: number) {
  if (height <= 0) {
    return '';
  }
  const radius = Math.min(4, width / 2, height);
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + width - radius} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}

const monthTickLabel = (month: string, everyOther: boolean, index: number) => {
  if (everyOther && index % 2 === 1) {
    return '';
  }
  return shortMonthLabels()[monthNumberOf(month) - 1];
};

export function CashflowChart({ months, outflowMode }: CashflowChartProps) {
  const { ref, width } = useElementSize();
  const [hovered, setHovered] = useState<number | null>(null);

  const outflowKey = outflowMode === 'gross' ? 'outflowGross' : 'outflow';
  const outflowLabel =
    outflowMode === 'gross' ? 'Saída bruta' : 'Saída líquida';

  const inflowValues = months.map((month) => toSignedCents(month.inflow));
  const outflowValues = months.map((month) => toSignedCents(month[outflowKey]));
  const accumulatedValues = months.map((month) =>
    toSignedCents(month.accumulatedBalance),
  );

  const scale = buildScale([
    ...inflowValues,
    ...outflowValues,
    ...accumulatedValues,
  ]);

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const groupWidth = plotWidth / Math.max(months.length, 1);

  const y = (value: number) =>
    PADDING.top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;

  const groupCenter = (index: number) =>
    PADDING.left + groupWidth * (index + 0.5);

  const barWidth = Math.max(
    2,
    Math.min(MAX_BAR_WIDTH, groupWidth / 2 - BAR_GAP),
  );
  const baseline = y(0);

  const linePoints = accumulatedValues
    .map((value, index) => `${groupCenter(index)},${y(value)}`)
    .join(' ');

  const showMarkers = months.length <= 18;
  const everyOther = months.length > 18;
  const active = hovered === null ? null : months[hovered];

  return (
    <div className={classes.root} ref={ref}>
      <div className={classes.legend}>
        <span className={classes.legendItem}>
          <span
            className={classes.swatch}
            style={{ backgroundColor: 'var(--fb-chart-inflow)' }}
          />
          Entradas
        </span>
        <span className={classes.legendItem}>
          <span
            className={classes.swatch}
            style={{ backgroundColor: 'var(--fb-chart-outflow)' }}
          />
          {outflowLabel}
        </span>
        <span className={classes.legendItem}>
          <span
            className={classes.swatchLine}
            style={{ backgroundColor: 'var(--fb-chart-balance)' }}
          />
          Saldo acumulado
        </span>
      </div>

      {width > 0 && (
        <svg
          className={classes.plot}
          height={HEIGHT}
          role="img"
          aria-label={`Fluxo de caixa mês a mês: entradas, ${outflowLabel.toLowerCase()} e saldo acumulado`}
        >
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === 0 ? classes.zeroLine : classes.gridLine}
                x1={PADDING.left}
                x2={PADDING.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className={classes.axisText}
                x={PADDING.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
              >
                {axisLabel(tick)}
              </text>
            </g>
          ))}

          {months.map((month, index) => {
            const center = groupCenter(index);
            const inflowTop = y(inflowValues[index]);
            const outflowTop = y(outflowValues[index]);

            return (
              <g key={month.month}>
                <path
                  className={classes.inflowMark}
                  d={barPath(
                    center - barWidth - BAR_GAP / 2,
                    inflowTop,
                    barWidth,
                    baseline - inflowTop,
                  )}
                />
                <path
                  className={classes.outflowMark}
                  d={barPath(
                    center + BAR_GAP / 2,
                    outflowTop,
                    barWidth,
                    baseline - outflowTop,
                  )}
                />
                <text
                  className={classes.axisText}
                  x={center}
                  y={HEIGHT - PADDING.bottom + 18}
                  textAnchor="middle"
                >
                  {monthTickLabel(month.month, everyOther, index)}
                </text>
              </g>
            );
          })}

          <polyline className={classes.balanceLine} points={linePoints} />

          {showMarkers &&
            accumulatedValues.map((value, index) => (
              <circle
                key={months[index].month}
                className={classes.balanceMarker}
                cx={groupCenter(index)}
                cy={y(value)}
                r={4}
              />
            ))}

          {hovered !== null && (
            <>
              <line
                className={classes.crosshair}
                x1={groupCenter(hovered)}
                x2={groupCenter(hovered)}
                y1={PADDING.top}
                y2={PADDING.top + plotHeight}
              />
              <circle
                className={classes.balanceMarker}
                cx={groupCenter(hovered)}
                cy={y(accumulatedValues[hovered])}
                r={5}
              />
            </>
          )}

          {months.map((month, index) => (
            <rect
              key={`hit-${month.month}`}
              className={classes.hitArea}
              x={PADDING.left + groupWidth * index}
              y={PADDING.top}
              width={groupWidth}
              height={plotHeight}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
      )}

      {active && (
        <div
          className={classes.tooltip}
          style={{
            left: Math.min(
              Math.max(groupCenter(hovered as number) - 96, 8),
              Math.max(width - 200, 8),
            ),
            top: PADDING.top + 24,
          }}
        >
          <div className={classes.tooltipTitle}>
            {formatMonth(active.month)}
          </div>
          <div className={classes.tooltipRow}>
            <span className={classes.tooltipLabel}>
              <span
                className={classes.swatch}
                style={{ backgroundColor: 'var(--fb-chart-inflow)' }}
              />
              Entradas
            </span>
            <MoneyText value={active.inflow} />
          </div>
          <div className={classes.tooltipRow}>
            <span className={classes.tooltipLabel}>
              <span
                className={classes.swatch}
                style={{ backgroundColor: 'var(--fb-chart-outflow)' }}
              />
              {outflowLabel}
            </span>
            <MoneyText value={active[outflowKey]} />
          </div>
          <div className={classes.tooltipRow}>
            <span className={classes.tooltipLabel}>
              <span
                className={classes.swatchLine}
                style={{ backgroundColor: 'var(--fb-chart-balance)' }}
              />
              Saldo acumulado
            </span>
            <MoneyText value={active.accumulatedBalance} />
          </div>
        </div>
      )}
    </div>
  );
}
