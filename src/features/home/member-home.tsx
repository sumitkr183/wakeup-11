import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { spacing } from '@/constants/theme';
import { useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import type { Profile } from '@/features/auth/session-provider';
import { useTeam } from '@/features/team/api';
import { useMarkAwake, usePendingWakeups, useTeamWakeups, type PendingWakeup } from '@/features/wakeups/api';
import { TeamStatusCard } from '@/features/wakeups/team-status';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { formatDay, formatDayAndTime, formatTime } from '@/lib/format';

import { AlarmPermissionBanner, HomeHeader, TestAlarmButton } from './shared';

export function MemberHome({ profile }: { profile: Profile }) {
  const team = useTeam(profile.team_id);
  const wakeups = usePendingWakeups();
  const teamWakeups = useTeamWakeups();
  const now = useNow();

  if (wakeups.isPending) return <LoadingView />;
  if (wakeups.isError) return <ErrorView error={wakeups.error} onRetry={() => void wakeups.refetch()} />;

  const [next, ...later] = wakeups.data;
  // The most recent wake-up that has started, so teammates can see who is up.
  const started = teamWakeups.data?.filter((wakeup) => new Date(wakeup.ring_at) <= now).at(-1);

  return (
    <Screen
      onRefresh={() => {
        void wakeups.refetch();
        void teamWakeups.refetch();
      }}
      refreshing={wakeups.isRefetching || teamWakeups.isRefetching}
      footer={<TestAlarmButton />}>
      <HomeHeader overline={team.data?.name ?? 'Your team'} title={`Hi, ${profile.display_name}`} />
      <AlarmPermissionBanner />

      {next ? (
        <NextWakeupCard wakeup={next} now={now} />
      ) : (
        <Card>
          <AppText variant="heading">No wake-ups scheduled</AppText>
          <AppText tone="muted">
            When your admin schedules one, it shows up here and the alarm is set on this phone automatically.
          </AppText>
        </Card>
      )}

      {started ? <TeamStatusCard wakeupId={started.id} userId={profile.id} /> : null}

      {later.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="overline" tone="muted">
            Later
          </AppText>
          {later.map((wakeup) => (
            <Card key={wakeup.id} style={styles.row}>
              <AppText variant="heading">{formatDayAndTime(new Date(wakeup.ring_at), now)}</AppText>
              {wakeup.message ? <AppText tone="muted">{wakeup.message}</AppText> : null}
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function NextWakeupCard({ wakeup, now }: { wakeup: PendingWakeup; now: Date }) {
  const { data: permission } = useAlarmPermission();
  const markAwake = useMarkAwake();
  const ringAt = new Date(wakeup.ring_at);
  const isRinging = ringAt <= now;
  const isArmed = permission === 'granted' && wakeup.alarm_set_at !== null;

  return (
    <Card highlighted style={styles.nextCard}>
      <AppText variant="overline" tone="accent">
        {isRinging ? 'Ringing now' : 'Next wake-up'}
      </AppText>
      <AppText variant="display">{formatTime(ringAt)}</AppText>
      <AppText>{formatDay(ringAt, now)}</AppText>
      {wakeup.message ? (
        <View style={styles.message}>
          <AppText>{wakeup.message}</AppText>
        </View>
      ) : null}

      {isRinging ? (
        <>
          <Button
            title="I'm awake"
            size="large"
            loading={markAwake.isPending}
            onPress={() => markAwake.mutate(wakeup.id)}
          />
          {markAwake.error ? <AppText tone="danger">{getErrorMessage(markAwake.error)}</AppText> : null}
        </>
      ) : (
        <AppText variant="label" tone={isArmed ? 'success' : 'muted'}>
          {isArmed ? 'Alarm set on this phone' : 'Setting the alarm on this phone…'}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  nextCard: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  message: {
    paddingTop: spacing.xs,
  },
});
