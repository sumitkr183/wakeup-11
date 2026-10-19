import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { colors, spacing } from '@/constants/theme';
import { useProfile } from '@/features/auth/session-provider';
import { useTeamMembers } from '@/features/team/api';
import { useCancelWakeup, useRingAgain, useWakeup, useWakeupStatus, type MemberStatus } from '@/features/wakeups/api';
import { getMemberState, getProgressCaption, type MemberState } from '@/features/wakeups/member-state';
import { MemberStatusRow } from '@/features/wakeups/team-status';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { formatDayAndTime, formatTime } from '@/lib/format';

type Tab = 'pending' | 'done';
type Row = { member: MemberStatus; state: MemberState };

/**
 * Who is awake and who isn't. Every teammate can open it; the call buttons
 * and the ring-again and cancel actions are admin-only.
 */
export default function WakeupStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const isAdmin = profile.role === 'admin';
  const wakeup = useWakeup(id);
  const status = useWakeupStatus(id);
  // Phone numbers, for the admin's call buttons.
  const teamMembers = useTeamMembers(profile.team_id, { enabled: isAdmin });
  const now = useNow(15_000);
  const [tab, setTab] = useState<Tab>('pending');

  const ringAtIso = wakeup.data?.ring_at;
  const rows = useMemo<Row[]>(() => {
    if (!ringAtIso || !status.data) return [];
    const ringAt = new Date(ringAtIso);
    return status.data.map((member) => ({ member, state: getMemberState(member, ringAt, now) }));
  }, [now, ringAtIso, status.data]);

  const phones = useMemo(
    () => new Map((teamMembers.data ?? []).map((member) => [member.id, member.phone])),
    [teamMembers.data],
  );

  if (wakeup.isPending || status.isPending) return <LoadingView />;
  if (wakeup.isError) return <ErrorView error={wakeup.error} onRetry={() => void wakeup.refetch()} />;
  if (status.isError) return <ErrorView error={status.error} onRetry={() => void status.refetch()} />;

  if (!wakeup.data || wakeup.data.cancelled_at) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="cancel" title="This wake-up was cancelled" message="Nobody’s alarm rings for it." />
      </Screen>
    );
  }

  const ringAt = new Date(wakeup.data.ring_at);
  const hasStarted = ringAt <= now;
  const done = rows.filter((row) => row.state.isDone);
  const pending = rows.filter((row) => !row.state.isDone);
  const visible = tab === 'pending' ? pending : done;
  // Nothing to ring once everyone is up, so the footer goes away entirely.
  const showAdminActions = isAdmin && (!hasStarted || pending.length > 0);
  const isComplete = pending.length === 0;
  const caption = getProgressCaption({
    ringAt,
    now,
    pendingCount: pending.length,
    needsCallCount: pending.filter((row) => row.state.needsCall).length,
  });

  return (
    <Screen
      edges={['bottom']}
      onRefresh={() => void status.refetch()}
      refreshing={status.isRefetching}
      footer={
        showAdminActions ? (
          <AdminActions wakeupId={id} hasStarted={hasStarted} pendingCount={pending.length} />
        ) : null
      }>
      <Appear index={0} style={styles.heading}>
        <View style={styles.liveRow}>
          {hasStarted ? <PulseDot /> : <Icon name="clock" size={14} color={colors.accent} />}
          <AppText variant="overline" tone="accent">
            {hasStarted ? `Live · ${formatTime(now)}` : 'Upcoming'}
          </AppText>
        </View>
        <AppText variant="title">{formatDayAndTime(ringAt, now)}</AppText>
        {wakeup.data.message ? <AppText tone="muted">{wakeup.data.message}</AppText> : null}
      </Appear>

      <Appear index={1}>
        <Card style={styles.summary}>
          <ProgressRing
            value={done.length}
            total={rows.length}
            caption={`of ${rows.length}`}
            color={isComplete ? colors.success : colors.accent}
            accessibilityLabel={`${done.length} of ${rows.length} ${hasStarted ? 'awake' : 'alarms set'}`}
          />
          <View style={styles.summaryText}>
            <SummaryStat
              color={colors.success}
              value={done.length}
              label={hasStarted ? 'awake' : 'alarms set'}
            />
            <SummaryStat
              color={pending.length > 0 ? colors.accent : colors.textSubtle}
              value={pending.length}
              label={hasStarted ? 'not yet' : 'not set'}
            />
            <AppText variant="caption" tone="muted">
              {caption}
            </AppText>
          </View>
        </Card>
      </Appear>

      <Appear index={2} style={styles.list}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `${hasStarted ? 'Not awake' : 'Not set'} · ${pending.length}` },
            { value: 'done', label: `${hasStarted ? 'Awake' : 'Set'} · ${done.length}`, activeColor: colors.success },
          ]}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' ? 'check' : 'moon'}
            title={tab === 'pending' ? 'Everyone is covered' : 'Nobody yet'}
            message={
              tab === 'pending'
                ? hasStarted
                  ? 'The whole team has checked in.'
                  : 'Every teammate has the alarm set.'
                : hasStarted
                  ? 'Check-ins appear here as people wake up.'
                  : 'Teammates appear here once their alarm is set.'
            }
          />
        ) : (
          visible.map(({ member, state }) => {
            const isYou = member.user_id === profile.id;
            return (
              <MemberStatusRow
                key={member.user_id}
                name={isYou ? `${member.display_name} (you)` : member.display_name}
                state={state}
                phone={isYou ? null : phones.get(member.user_id)}
              />
            );
          })
        )}
      </Appear>
    </Screen>
  );
}

function SummaryStat({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <AppText variant="heading">{value}</AppText>
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

type AdminActionsProps = {
  wakeupId: string;
  hasStarted: boolean;
  pendingCount: number;
};

/** Before ring time: cancel. After: ring everyone who is still asleep. */
function AdminActions({ wakeupId, hasStarted, pendingCount }: AdminActionsProps) {
  const ringAgain = useRingAgain();
  const cancel = useCancelWakeup();

  if (hasStarted) {
    const ringPending = () =>
      ringAgain.mutate(wakeupId, {
        onSuccess: (count) => Alert.alert('Ringing again', `Sent to ${count} teammate${count === 1 ? '' : 's'}.`),
        onError: (error) => Alert.alert("Couldn't ring", getErrorMessage(error)),
      });
    return (
      <Button
        title={`Ring the ${pendingCount} again now`}
        icon="bell"
        loading={ringAgain.isPending}
        onPress={ringPending}
      />
    );
  }

  const confirmCancel = () =>
    Alert.alert('Cancel this wake-up?', 'Teammates get a notification and their alarms are removed.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel wake-up',
        style: 'destructive',
        onPress: () =>
          cancel.mutate(wakeupId, {
            onSuccess: () => router.back(),
            onError: (error) => Alert.alert("Couldn't cancel", getErrorMessage(error)),
          }),
      },
    ]);
  return (
    <Button
      title="Cancel wake-up"
      icon="cancel"
      variant="danger"
      loading={cancel.isPending}
      onPress={confirmCancel}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
  },
  summaryText: {
    flex: 1,
    gap: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    gap: spacing.sm,
  },
});
