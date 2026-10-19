import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import { AppText } from './app-text';
import { Button } from './button';
import { Card } from './card';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

type ErrorViewProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.center}>
      <AppText variant="heading">Couldn’t load this</AppText>
      <AppText tone="muted" style={styles.message}>
        {getErrorMessage(error)}
      </AppText>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

/** Loading state for one section, so the rest of the screen stays usable. */
export function InlineLoading() {
  return <ActivityIndicator color={colors.accent} style={styles.inlineLoading} />;
}

/** Error state for one section, so the rest of the screen stays usable. */
export function InlineError({ error, onRetry }: ErrorViewProps) {
  return (
    <Card>
      <AppText variant="heading">Couldn’t load this</AppText>
      <AppText tone="muted">{getErrorMessage(error)}</AppText>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  inlineLoading: {
    paddingVertical: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: {
    textAlign: 'center',
  },
});
