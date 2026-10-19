import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IconName } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { colors, spacing } from '@/constants/theme';
import { requestAlarmPermission } from '@/features/alarm/notifications';
import { syncAlarms } from '@/features/alarm/scheduler';
import { alarmPermissionQueryKey, useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import { registerDeviceForPush } from '@/features/devices/device-registration';
import { TestAlarmButton } from '@/features/home/shared';
import { logSyncError } from '@/features/wakeups/api';

type Tip = { icon: IconName; text: string };

const PLATFORM_TIPS: readonly Tip[] =
  Platform.OS === 'ios'
    ? [
        {
          icon: 'bolt',
          text: 'In Settings › Notifications › Wakeup 11, turn on Time Sensitive Notifications so alarms break through Focus and Sleep modes.',
        },
        { icon: 'battery', text: 'Keep the phone charged overnight, and keep the app signed in.' },
      ]
    : [
        {
          icon: 'volume',
          text: 'Alarms play at your alarm volume, not your ringer volume, so they ring on silent. Keep the alarm volume up.',
        },
        { icon: 'battery', text: 'If your phone has a battery saver for apps, set Wakeup 11 to "No restrictions".' },
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
  const isDenied = permission === 'denied';

  return (
    <Screen edges={['bottom']} footer={isGranted ? <TestAlarmButton /> : null}>
      <Appear index={0} style={styles.intro}>
        <IconCircle name="alarm" size={64} />
        <AppText variant="title">Let alarms ring</AppText>
        <AppText tone="muted">
          Wakeup 11 sets a real alarm on this phone for every team wake-up, so it rings even if the internet is down
          in the morning.
        </AppText>
      </Appear>

      <Appear index={1}>
        <Card highlighted={!isGranted} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <IconCircle
              name={isGranted ? 'shield' : 'bell'}
              color={isGranted ? colors.success : colors.accent}
              backgroundColor={isGranted ? colors.successSoft : colors.accentSoft}
            />
            <View style={styles.statusText}>
              <AppText variant="heading">Notifications and alarms</AppText>
              <Badge
                label={isGranted ? 'Allowed' : isDenied ? 'Blocked in Settings' : 'Not allowed yet'}
                tone={isGranted ? 'success' : isDenied ? 'danger' : 'neutral'}
                icon={isGranted ? 'check' : isDenied ? 'cancel' : undefined}
              />
            </View>
          </View>
          {isGranted ? null : isDenied ? (
            <Button title="Open Settings" icon="settings" onPress={() => void Linking.openSettings()} />
          ) : (
            <Button title="Allow alarms" icon="bell" loading={request.isPending} onPress={() => request.mutate()} />
          )}
        </Card>
      </Appear>

      <Appear index={2}>
        <Section title="For a reliable wake-up">
          <Card style={styles.tips}>
            {PLATFORM_TIPS.map((tip) => (
              <View key={tip.text} style={styles.tip}>
                <IconCircle
                  name={tip.icon}
                  size={36}
                  color={colors.textMuted}
                  backgroundColor={colors.surfaceRaised}
                />
                <AppText tone="muted" style={styles.tipText}>
                  {tip.text}
                </AppText>
              </View>
            ))}
          </Card>
        </Section>
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  statusCard: {
    gap: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusText: {
    flex: 1,
    gap: spacing.xs,
  },
  tips: {
    gap: spacing.lg,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tipText: {
    flex: 1,
  },
});
