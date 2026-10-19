import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { spacing } from '@/constants/theme';

import type { TeamMember } from './api';
import { CallButton } from './call-button';

type MemberListProps = {
  members: TeamMember[];
  currentUserId: string;
};

export function MemberList({ members, currentUserId }: MemberListProps) {
  const players = members.filter((member) => member.role === 'member');

  return (
    <>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} isYou={member.id === currentUserId} />
      ))}
      {players.length === 0 ? (
        <AppText tone="muted">
          Nobody has joined yet. Share the invite code and players appear here as they sign up.
        </AppText>
      ) : null}
    </>
  );
}

function MemberRow({ member, isYou }: { member: TeamMember; isYou: boolean }) {
  const tags = [member.role === 'admin' ? 'Admin' : null, isYou ? 'You' : null].filter(Boolean).join(' · ');

  return (
    <Card style={styles.row}>
      <View style={styles.text}>
        <AppText variant="heading" numberOfLines={1}>
          {member.display_name}
        </AppText>
        <AppText variant="caption" tone="muted">
          {[member.phone, tags].filter(Boolean).join(' · ') || 'No phone number'}
        </AppText>
      </View>
      {member.phone && !isYou ? <CallButton name={member.display_name} phone={member.phone} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
});
