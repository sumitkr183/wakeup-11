import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';
import { scheduleTestAlarm } from '@/features/alarm/scheduler';
import { useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import { leaveTeam } from '@/features/auth/api';
import { useProfile } from '@/features/auth/session-provider';
import { getErrorMessage } from '@/lib/errors';

const TEST_ALARM_DELAY_SECONDS = 10;

export function HomeHeader({ overline, title }: { overline: string; title: string }) {
  // The admin has no way to sign back in to an anonymous account, so only members can leave.
  const canLeave = useProfile().role === 'member';
  const leaveMutation = useMutation({
    mutationFn: leaveTeam,
    onError: (error) => Alert.alert("Couldn't leave the team", getErrorMessage(error)),
  });

  const confirmLeave = () =>
    Alert.alert(
      'Leave team?',
      "Alarms on this phone stop. You'll need the invite code to join again.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
      ],
    );

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="overline" tone="accent">
          {overline}
        </AppText>
        <AppText variant="title" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      {canLeave ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave team"
          onPress={confirmLeave}
          disabled={leaveMutation.isPending}
          style={({ pressed }) => [styles.leave, pressed && styles.pressed]}>
          <AppText variant="label" tone="muted">
            Leave team
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Shown until this phone is allowed to ring. */
export function AlarmPermissionBanner() {
  const { data: permission } = useAlarmPermission();
  if (permission === undefined || permission === 'granted') return null;

  return (
    <Card highlighted>
      <AppText variant="heading">Alarms are off on this phone</AppText>
      <AppText tone="muted">
        Allow alarms so wake-ups can ring here. Until then, your admin sees you as not ready.
      </AppText>
      <Link href="/permissions" asChild>
        <Button title="Turn on alarms" />
      </Link>
    </Card>
  );
}

export function TestAlarmButton() {
  const testAlarm = useMutation({
    mutationFn: () => scheduleTestAlarm(TEST_ALARM_DELAY_SECONDS),
    onSuccess: () =>
      Alert.alert(
        'Test alarm set',
        `Lock your phone and put it on silent. It rings in ${TEST_ALARM_DELAY_SECONDS} seconds.`,
      ),
    onError: (error) => Alert.alert("Couldn't set a test alarm", getErrorMessage(error)),
  });

  return (
    <Button
      title="Test my alarm"
      variant="secondary"
      loading={testAlarm.isPending}
      onPress={() => testAlarm.mutate()}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  leave: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
