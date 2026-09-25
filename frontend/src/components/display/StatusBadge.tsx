import { STATUS_LABELS, type EffectiveStatus } from '../../api/types';
import classes from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: EffectiveStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`${classes.badge} ${classes[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
