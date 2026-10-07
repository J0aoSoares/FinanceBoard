import { STATUS_LABELS, type EffectiveStatus } from '../../api/types';
import classes from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: EffectiveStatus;
  labels?: Record<EffectiveStatus, string>;
}

export function StatusBadge({
  status,
  labels = STATUS_LABELS,
}: StatusBadgeProps) {
  return (
    <span className={`${classes.badge} ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}
