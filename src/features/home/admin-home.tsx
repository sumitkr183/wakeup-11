import { Link, router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { InlineError, InlineLoading } from '@/components/ui/status-view';
import { colors, radius, spacing } from '@/constants/theme';
import type { Profile } from '@/features/auth/session-provider';
import { useTeam, useTeamMembers } from '@/features/team/api';
import { MemberList } from '@/features/team/member-list';
import { useTeamWakeups, type TeamWakeup } from '@/features/wakeups/api';
import { useNow } from '@/hooks/use-now';
import type { Tables } from '@/lib/database.types';
import { formatDay, formatTime } from '@/lib/format';

import { AlarmPermissionBanner, HomeHeader, TestAlarmButton } from './shared';

type Team = Tables<'teams'>;

/**
 * Each section loads and fails on its own, so the schedule button and invite
 * code stay reachable even if one request fails.
 */
export function AdminHome({ profile }: { profile: Profile }) {
  const team = useTeam(profile.team_id);
  const wakeups = useTeamWakeups();
  const members = useTeamMembers(profile.team_id);
  const now = useNow();

  const refresh = () => {
    void team.refetch();
    void wakeups.refetch();
    void members.refetch();
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={wakeups.isRefetching || members.isRefetching}
      footer={
        <Link href="/schedule" asChild>
          <Button title="Schedule wake-up" icon="plus" />
        </Link>
      }>
      <Appear index={0}>
        <HomeHeader overline="Admin" title={team.data?.name ?? 'Your team'} />
      </Appear>
      <AlarmPermissionBanner />

      {team.data ? (
        <Appear index={1}>
          <InviteCard team={team.data} />
        </Appear>
      ) : null}

      <Appear index={2}>
        <Section title="Wake-ups" count={wakeups.data?.length}>
          {wakeups.isPending ? (
            <InlineLoading />
          ) : wakeups.isError ? (
            <InlineError error={wakeups.error} onRetry={() => void wakeups.refetch()} />
          ) : wakeups.data.length === 0 ? (
            <EmptyState
              icon="moon"
              title="Nothing scheduled"
              message="Schedule a wake-up and every teammate’s phone sets an alarm for it."
            />
          ) : (
            wakeups.data.map((wakeup) => <WakeupRow key={wakeup.id} wakeup={wakeup} now={now} />)
          )}
        </Section>
      </Appear>

      <Appear index={3}>
        <Section title="Team" count={members.data?.length}>
          {members.isPending ? (
            <InlineLoading />
          ) : members.isError ? (
            <InlineError error={members.error} onRetry={() => void members.refetch()} />
          ) : (
            <MemberList members={members.data} currentUserId={profile.id} />
          )}
        </Section>
      </Appear>

      <Appear index={4}>
        <TestAlarmButton />
      </Appear>
    </Screen>
  );
}

function InviteCard({ team }: { team: Team }) {
  const shareInvite = () =>
    void Share.share({
      message: `Join ${team.name} on Wakeup 11. Install the app and enter invite code ${team.invite_code}.`,
    });

  return (
    <Card highlighted style={styles.invite}>
      <View style={styles.inviteText}>
        <View style={styles.inviteLabel}>
          <Icon name="key" size={14} color={colors.accent} />
          <AppText variant="overline" tone="accent">
            Invite code
          </AppText>
        </View>
        <AppText variant="title" selectable style={styles.code}>
          {team.invite_code}
        </AppText>
        <AppText variant="caption" tone="muted">
          Share it so players can join your team.
        </AppText>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Share invite code"
        onPress={shareInvite}
        style={styles.shareButton}>
        <Icon name="share" size={22} color={colors.onAccent} />
      </PressableScale>
    </Card>
  );
}

function WakeupRow({ wakeup, now }: { wakeup: TeamWakeup; now: Date }) {
  const ringAt = new Date(wakeup.ring_at);
  const hasStarted = ringAt <= now;
  const doneCount = hasStarted ? wakeup.awake_count : wakeup.alarm_set_count;
  const isComplete = doneCount === wakeup.member_count;
  const progress = `${doneCount} of ${wakeup.member_count} ${hasStarted ? 'awake' : 'alarms set'}`;

  return (
    // Not `<Link asChild>`: its Slot replaces the child's style, which drops the press animation.
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${formatDay(ringAt, now)}, ${formatTime(ringAt)}. ${progress}`}
      accessibilityHint="Opens live status"
      onPress={() => router.push({ pathname: '/wakeups/[id]', params: { id: wakeup.id } })}>
      <Card highlighted={hasStarted && !isComplete} style={styles.wakeupCard}>
        <View style={styles.wakeupTop}>
          <View style={styles.wakeupTime}>
            <AppText variant="title">{formatTime(ringAt)}</AppText>
            <AppText variant="caption" tone="muted">
              {formatDay(ringAt, now)}
            </AppText>
          </View>
          {hasStarted ? (
            <Badge
              label={isComplete ? 'All up' : 'Live'}
              tone={isComplete ? 'success' : 'accent'}
              icon={isComplete ? 'check' : 'bolt'}
            />
          ) : (
            <Badge label="Upcoming" icon="clock" />
          )}
          <Icon name="chevronRight" size={16} color={colors.textSubtle} />
        </View>

        {wakeup.message ? (
          <AppText tone="muted" numberOfLines={1}>
            {wakeup.message}
          </AppText>
        ) : null}

        <View style={styles.wakeupProgress}>
          <ProgressBar
            value={doneCount}
            total={wakeup.member_count}
            color={isComplete ? colors.success : colors.accent}
            height={6}
          />
          <AppText variant="caption" tone={isComplete ? 'success' : 'muted'}>
            {progress}
          </AppText>
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  inviteText: {
    flex: 1,
    gap: spacing.xs,
  },
  inviteLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  code: {
    fontSize: 32,
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  shareButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  wakeupCard: {
    gap: spacing.md,
  },
  wakeupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wakeupTime: {
    flex: 1,
    gap: spacing.xxs,
  },
  wakeupProgress: {
    gap: spacing.sm,
  },
});
