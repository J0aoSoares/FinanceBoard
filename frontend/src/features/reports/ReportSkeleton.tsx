import { Skeleton, Stack } from '@mantine/core';

interface ReportSkeletonProps {
  rows?: number;
  withChart?: boolean;
}

export function ReportSkeleton({
  rows = 8,
  withChart = false,
}: ReportSkeletonProps) {
  return (
    <Stack gap="md">
      {withChart && <Skeleton height={320} radius="var(--fb-radius-lg)" />}
      <Stack gap={2}>
        <Skeleton height={40} radius="var(--fb-radius-lg)" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} height={38} />
        ))}
      </Stack>
    </Stack>
  );
}
