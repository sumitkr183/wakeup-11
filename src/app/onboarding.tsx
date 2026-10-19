import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { colors, gradients, radius, shadows, spacing } from '@/constants/theme';
import { useOnboarding } from '@/features/team/api';
import { getErrorMessage } from '@/lib/errors';

type Mode = 'join' | 'create';

const MODE_OPTIONS = [
  { value: 'join', label: 'Join a team' },
  { value: 'create', label: 'Create a team' },
] as const;

// Same rule as private.normalize_phone on the server.
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const normalizePhone = (value: string) => value.replace(/[\s().-]/g, '');

export default function OnboardingScreen() {
  const { createTeam, joinTeam } = useOnboarding();

  const [mode, setMode] = useState<Mode>('join');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');

  const mutation = mode === 'join' ? joinTeam : createTeam;
  const name = displayName.trim();
  const normalizedPhone = normalizePhone(phone);
  const canSubmit =
    name.length > 0 &&
    PHONE_PATTERN.test(normalizedPhone) &&
    (mode === 'join' ? inviteCode.trim().length >= 6 : teamName.trim().length >= 2);

  const submit = () => {
    if (!canSubmit) return;
    if (mode === 'join') {
      joinTeam.mutate({ inviteCode, displayName: name, phone: normalizedPhone });
    } else {
      createTeam.mutate({ teamName: teamName.trim(), displayName: name, phone: normalizedPhone });
    }
  };

  const switchMode = (next: Mode) => {
    joinTeam.reset();
    createTeam.reset();
    setMode(next);
  };

  return (
    <Screen
      footer={
        <Button
          title={mode === 'join' ? 'Join team' : 'Create team'}
          icon={mode === 'join' ? 'people' : 'plus'}
          loading={mutation.isPending}
          disabled={!canSubmit}
          onPress={submit}
        />
      }>
      <Appear index={0} style={styles.hero}>
        <View style={styles.logo}>
          <Icon name="sunrise" size={34} color={colors.onAccent} />
        </View>
        <AppText variant="largeTitle" accessibilityRole="header">
          {mode === 'join' ? "Join your team's wake-up call" : 'Create your team'}
        </AppText>
        <AppText tone="muted">
          {mode === 'join'
            ? 'Ask your admin for the invite code. After you join, every wake-up they schedule rings on this phone.'
            : "You'll be the admin. Share the invite code with teammates so they can join."}
        </AppText>
      </Appear>

      <Appear index={1}>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={switchMode} />
      </Appear>

      <Appear index={2} style={styles.form}>
        {mode === 'join' ? (
          <TextField
            label="Invite code"
            icon="key"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="e.g. K7M2QX"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            style={styles.code}
          />
        ) : (
          <TextField
            label="Team name"
            icon="people"
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g. Morning Cricket XI"
            maxLength={60}
          />
        )}

        <TextField
          label="Your name"
          icon="person"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How teammates will see you"
          autoComplete="name"
          textContentType="name"
          maxLength={40}
        />

        <TextField
          label="Phone number"
          icon="phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +91 98765 43210"
          hint="Your team can see this."
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={mutation.error ? getErrorMessage(mutation.error) : null}
        />
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    experimental_backgroundImage: gradients.sunrise,
    ...shadows.glow,
  },
  form: {
    gap: spacing.xl,
  },
  code: {
    letterSpacing: 3,
    fontWeight: '700',
  },
});
