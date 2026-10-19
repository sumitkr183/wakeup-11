import { useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  /** Shown inside the field, before the text. */
  icon?: IconName;
};

export function TextField({ label, hint, error, icon, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const labelId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const helper = error ?? hint;

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="muted" nativeID={labelId}>
        {label}
      </AppText>
      <View style={[styles.field, isFocused && styles.fieldFocused, error ? styles.fieldError : null]}>
        {icon ? <Icon name={icon} size={18} color={isFocused ? colors.accent : colors.textSubtle} /> : null}
        <TextInput
          accessibilityLabelledBy={labelId}
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          style={[styles.input, style]}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {helper ? (
        <AppText variant="caption" tone={error ? 'danger' : 'subtle'}>
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
  field: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    color: colors.text,
    fontSize: 17,
  },
});
