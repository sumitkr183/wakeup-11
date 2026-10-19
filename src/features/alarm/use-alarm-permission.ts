import { useQuery } from '@tanstack/react-query';

import { getAlarmPermission } from './notifications';

export const alarmPermissionQueryKey = ['alarm-permission'] as const;

/** Notification permission, re-checked whenever the app returns to the foreground. */
export function useAlarmPermission() {
  return useQuery({
    queryKey: alarmPermissionQueryKey,
    queryFn: getAlarmPermission,
    staleTime: 0,
    retry: false,
  });
}
