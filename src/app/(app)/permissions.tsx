import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { spacing } from '@/constants/theme';
import { requestAlarmPermission } from '@/features/alarm/notifications';
import { syncAlarms } from '@/features/alarm/scheduler';
import { alarmPermissionQueryKey, useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import { registerDeviceForPush } from '@/features/devices/device-registration';
import { logSyncError } from '@/features/wakeups/api';
import { TestAlarmButton } from '@/features/home/shared';

const PLATFORM_TIPS =
  Platform.OS === 'ios'
    ? [
        'In Settings › Notifications › Wakeup 11, turn on Time Sensitive Notifications so alarms break through Focus and Sleep modes.',
        'Keep the phone charged overnight, and keep the app signed in.',
      ]
    : [
        'Alarms play at your alarm volume, not your ringer volume, so they ring on silent. Keep the alarm volume up.',
        'If your phone has a battery saver for apps, set Wakeup 11 to "No restrictions".',
      ];

export default function PermissionsScreen() {
  const queryClient = useQueryClient();
  const { data: permission } = useAlarmPermission();

  const request = useMutation({
    mutationFn: requestAlarmPermission,
    onSuccess: (result) => {
      queryClient.setQueryData(alarmPermissionQueryKey, result);
      if (result !== 'granted') return;
      syncAlarms().catch(logSyncError);
      registerDeviceForPush().catch((error: unknown) => console.warn('[push] Registration failed', error));
    },
  });

  const isGranted = permission === 'granted';

  return (
    <Screen edges={['bottom']} footer={isGranted ? <TestAlarmButton /> : null}>
      <View style={styles.intro}>
        <AppText variant="title">Let alarms ring</AppText>
        <AppText tone="muted">
          Wakeup 11 sets a real alarm on this phone for every team wake-up, so it rings even if the internet is
          down in the morning.
        </AppText>
      </View>

      <Card highlighted={!isGranted}>
        <AppText variant="heading">Notifications and alarms</AppText>
        <AppText variant="label" tone={isGranted ? 'success' : permission === 'denied' ? 'danger' : 'muted'}>
          {isGranted ? 'Allowed' : permission === 'denied' ? 'Blocked in Settings' : 'Not allowed yet'}
        </AppText>
        {isGranted ? null : permission === 'denied' ? (
          <Button title="Open Settings" onPress={() => void Linking.openSettings()} />
        ) : (
          <Button title="Allow alarms" loading={request.isPending} onPress={() => request.mutate()} />
        )}
      </Card>

      <View style={styles.tips}>
        <AppText variant="overline" tone="muted">
          For a reliable wake-up
        </AppText>
        {PLATFORM_TIPS.map((tip) => (
          <AppText key={tip} tone="muted">
            • {tip}
          </AppText>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  tips: {
    gap: spacing.sm,
  },
});
