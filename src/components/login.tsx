import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, palette } from '@/constants/theme';
import { signIn } from '@/lib/supabase';

// Session gate. Shown only when Supabase is configured but signed out; a
// successful sign-in flips the auth listener in useSession, so no callback is
// needed. Skippable — being off-grid must never block training.
export function Login({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !email.trim() || !password) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 14,
        }}>
        <View>
          <Text style={styles.kicker}>EXPEDITION CONDITIONING</Text>
          <Text style={styles.title}>SIGN IN</Text>
          <Text style={styles.subtitle}>
            One account syncs the log across devices. Everything still records on-device when
            you're off-grid.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            style={styles.input}
          />
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            onSubmitEditing={submit}
            style={styles.input}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Pressable onPress={submit} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
          <Text style={styles.primaryBtnText}>{busy ? 'SIGNING IN…' : 'SIGN IN'}</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>TRAIN OFFLINE — SYNC LATER</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  kicker: {
    fontFamily: FontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 3,
    color: palette.orange,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    letterSpacing: 2,
    color: palette.text,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: palette.textDim,
    lineHeight: 20,
    marginTop: 6,
  },
  panel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  fieldLabel: {
    fontFamily: FontFamily.display,
    fontSize: 10,
    letterSpacing: 1.5,
    color: palette.muted,
  },
  input: {
    marginTop: 6,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 15,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  error: {
    marginTop: 12,
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: palette.orange,
    lineHeight: 16,
  },
  primaryBtn: {
    backgroundColor: palette.orange,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: palette.bg,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: palette.muted,
    fontFamily: FontFamily.display,
    fontSize: 10.5,
    letterSpacing: 1.5,
  },
});
