import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';
import { scheduleTestAlarm } from '@/features/alarm/scheduler';
import { useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import { leaveTeam } from '@/features/auth/api';
import { useProfile } from '@/features/auth/session-provider';
import { getErrorMessage } from '@/lib/errors';

const TEST_ALARM_DELAY_SECONDS = 10;

type HomeHeaderProps = {
  overline: string;
  title: string;
  /** Shows this person's avatar next to the title. */
  avatarName?: string;
};

export function HomeHeader({ overline, title, avatarName }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      {avatarName ? <Avatar name={avatarName} size={52} /> : null}
      <View style={styles.headerText}>
        <AppText variant="overline" tone="accent" numberOfLines={1}>
          {overline}
        </AppText>
        <AppText variant={avatarName ? 'title' : 'largeTitle'} accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Members only: the admin has no way to sign back in to an anonymous account,
 * so leaving would orphan the team.
 */
export function LeaveTeamButton() {
  const isMember = useProfile().role === 'member';
  const leaveMutation = useMutation({
    mutationFn: leaveTeam,
    onError: (error) => Alert.alert("Couldn't leave the team", getErrorMessage(error)),
  });

  if (!isMember) return null;

  const confirmLeave = () =>
    Alert.alert('Leave team?', "Alarms on this phone stop. You'll need the invite code to join again.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: leaveMutation.isPending, busy: leaveMutation.isPending }}
      onPress={confirmLeave}
      disabled={leaveMutation.isPending}
      style={styles.leave}>
      {leaveMutation.isPending ? (
        <ActivityIndicator color={colors.danger} />
      ) : (
        <>
          <Icon name="leave" size={16} color={colors.danger} />
          <AppText variant="label" tone="danger">
            Leave team
          </AppText>
        </>
      )}
    </PressableScale>
  );
}

/** Shown until this phone is allowed to ring. */
export function AlarmPermissionBanner() {
  const { data: permission } = useAlarmPermission();
  if (permission === undefined || permission === 'granted') return null;

  return (
    <Card highlighted style={styles.banner}>
      <View style={styles.bannerHeader}>
        <IconCircle name="bellOff" />
        <View style={styles.bannerText}>
          <AppText variant="heading">Alarms are off on this phone</AppText>
          <AppText variant="caption" tone="muted">
            Allow alarms so wake-ups can ring here. Until then, your admin sees you as not ready.
          </AppText>
        </View>
      </View>
      <Link href="/permissions" asChild>
        <Button title="Turn on alarms" icon="bell" />
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
      icon="play"
      variant="secondary"
      loading={testAlarm.isPending}
      onPress={() => testAlarm.mutate()}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  leave: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  banner: {
    gap: spacing.lg,
  },
  bannerHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bannerText: {
    flex: 1,
    gap: spacing.xs,
  },
});
