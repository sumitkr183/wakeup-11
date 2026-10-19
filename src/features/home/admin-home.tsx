import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { InlineError, InlineLoading } from '@/components/ui/status-view';
import { spacing } from '@/constants/theme';
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
          <Button title="Schedule wake-up" />
        </Link>
      }>
      <HomeHeader overline="Admin" title={team.data?.name ?? 'Your team'} />
      <AlarmPermissionBanner />

      {team.data ? <InviteCard team={team.data} /> : null}

      <Section title="Wake-ups">
        {wakeups.isPending ? (
          <InlineLoading />
        ) : wakeups.isError ? (
          <InlineError error={wakeups.error} onRetry={() => void wakeups.refetch()} />
        ) : wakeups.data.length === 0 ? (
          <Card>
            <AppText variant="heading">Nothing scheduled</AppText>
            <AppText tone="muted">Schedule a wake-up and every teammate’s phone sets an alarm for it.</AppText>
          </Card>
        ) : (
          wakeups.data.map((wakeup) => <WakeupRow key={wakeup.id} wakeup={wakeup} now={now} />)
        )}
      </Section>

      <Section title={members.data ? `Players (${members.data.length})` : 'Players'}>
        {members.isPending ? (
          <InlineLoading />
        ) : members.isError ? (
          <InlineError error={members.error} onRetry={() => void members.refetch()} />
        ) : (
          <MemberList members={members.data} currentUserId={profile.id} />
        )}
      </Section>

      <TestAlarmButton />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function InviteCard({ team }: { team: Team }) {
  const shareInvite = () =>
    void Share.share({
      message: `Join ${team.name} on Wakeup 11. Install the app and enter invite code ${team.invite_code}.`,
    });

  return (
    <Card style={styles.invite}>
      <View style={styles.inviteText}>
        <AppText variant="label" tone="muted">
          Invite code
        </AppText>
        <AppText variant="title" selectable style={styles.code}>
          {team.invite_code}
        </AppText>
      </View>
      <Button title="Share" variant="secondary" onPress={shareInvite} />
    </Card>
  );
}

function WakeupRow({ wakeup, now }: { wakeup: TeamWakeup; now: Date }) {
  const ringAt = new Date(wakeup.ring_at);
  const hasStarted = ringAt <= now;
  const progress = hasStarted
    ? `${wakeup.awake_count} of ${wakeup.member_count} awake`
    : `${wakeup.alarm_set_count} of ${wakeup.member_count} alarms set`;
  const isComplete = hasStarted
    ? wakeup.awake_count === wakeup.member_count
    : wakeup.alarm_set_count === wakeup.member_count;

  return (
    // Not `<Link asChild>`: its Slot replaces a style function with `{}`, which drops the pressed state.
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens live status"
      onPress={() => router.push({ pathname: '/wakeups/[id]', params: { id: wakeup.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card highlighted={hasStarted && !isComplete}>
        <View style={styles.rowTop}>
          <AppText variant="heading">
            {formatDay(ringAt, now)}, {formatTime(ringAt)}
          </AppText>
          <AppText variant="label" tone={isComplete ? 'success' : 'accent'}>
            {progress}
          </AppText>
        </View>
        {wakeup.message ? (
          <AppText tone="muted" numberOfLines={1}>
            {wakeup.message}
          </AppText>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  inviteText: {
    flex: 1,
    gap: spacing.xs,
  },
  code: {
    letterSpacing: 4,
  },
  section: {
    gap: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
