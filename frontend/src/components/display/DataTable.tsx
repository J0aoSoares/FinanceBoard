import type { ReactNode } from 'react';
import classes from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  numeric?: boolean;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  items: T[];
  rowKey: (item: T) => string;
  emptyMessage: string;
  renderActions?: (item: T) => ReactNode;
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  items,
  rowKey,
  emptyMessage,
  renderActions,
  footer,
}: DataTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>{emptyMessage}</p>
      </div>
    );
  }

  const columnCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.numeric ? classes.numeric : undefined}
              >
                {column.header}
              </th>
            ))}
            {renderActions && <th className={classes.actions} />}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={rowKey(item)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.numeric ? classes.numeric : undefined}
                >
                  {column.render(item)}
                </td>
              ))}
              {renderActions && (
                <td className={classes.actions}>{renderActions(item)}</td>
              )}
            </tr>
          ))}
        </tbody>

        {footer && (
          <tfoot>
            <tr className={classes.footer}>
              <td colSpan={columnCount}>{footer}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
