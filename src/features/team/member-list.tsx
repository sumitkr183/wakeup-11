import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { colors, spacing } from '@/constants/theme';

import type { TeamMember } from './api';
import { CallButton } from './call-button';

type MemberListProps = {
  members: TeamMember[];
  currentUserId: string;
  /** Calling is an admin action; teammates see the roster without call buttons. */
  showCallButtons?: boolean;
};

export function MemberList({ members, currentUserId, showCallButtons = true }: MemberListProps) {
  const hasPlayers = members.some((member) => member.role === 'member');

  return (
    <>
      <Card style={styles.list}>
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            isYou={member.id === currentUserId}
            isFirst={index === 0}
            showCallButton={showCallButtons}
          />
        ))}
      </Card>
      {hasPlayers ? null : (
        <EmptyState
          icon="people"
          title="No players yet"
          message="Share the invite code and players appear here as they sign up."
        />
      )}
    </>
  );
}

type MemberRowProps = {
  member: TeamMember;
  isYou: boolean;
  isFirst: boolean;
  showCallButton: boolean;
};

function MemberRow({ member, isYou, isFirst, showCallButton }: MemberRowProps) {
  return (
    <View style={[styles.row, !isFirst && styles.divider]}>
      <Avatar name={member.display_name} />
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <AppText variant="heading" numberOfLines={1} style={styles.name}>
            {member.display_name}
          </AppText>
          {member.role === 'admin' ? <Badge label="Admin" tone="accent" /> : null}
          {isYou ? <Badge label="You" /> : null}
        </View>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {member.phone || 'No phone number'}
        </AppText>
      </View>
      {showCallButton && member.phone && !isYou ? <CallButton name={member.display_name} phone={member.phone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: spacing.xs,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
});
