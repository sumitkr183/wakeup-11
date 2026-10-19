import { useId } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';

export type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function TextField({ label, hint, error, style, ...rest }: TextFieldProps) {
  const labelId = useId();
  const helper = error ?? hint;

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted" nativeID={labelId}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabelledBy={labelId}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {helper ? (
        <AppText variant="caption" tone={error ? 'danger' : 'muted'}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
  },
  inputError: {
    borderColor: colors.danger,
  },
});
