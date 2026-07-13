import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { FontFamily, goldTint, palette } from '@/constants/theme';
import { sendMagicLink, signIn, verifyEmailCode } from '@/lib/supabase';

// Session gate. Magic link is the primary path (a new email auto-creates the
// account); the emailed link deep-links back via expedition://auth-callback,
// and the 6-digit code is the no-deep-link fallback. A successful sign-in
// flips the auth listener in useSession, so no callback is needed.
// Skippable — being off-grid must never block training.

type Mode = 'magic' | 'sent' | 'password';

export function Login({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const sendLink = () => {
    if (!email.trim()) return;
    run(async () => {
      await sendMagicLink(email.trim());
      setCode('');
      setMode('sent');
    });
  };

  const verifyCode = () => {
    if (!code.trim()) return;
    run(() => verifyEmailCode(email.trim(), code.trim()));
  };

  const passwordSignIn = () => {
    if (!email.trim() || !password) return;
    run(() => signIn(email.trim(), password));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 14,
        }}>
        <View>
          <Logo size={64} />
          <Text style={[styles.kicker, { marginTop: 14 }]}>SWITCHBACK</Text>
          <Text style={styles.title}>{mode === 'sent' ? 'CHECK YOUR EMAIL' : 'SIGN IN'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'sent'
              ? `Sign-in link sent to ${email.trim()}. Open it on this phone — or enter the 6-digit code from the email below.`
              : 'One account syncs the log across devices — new emails are signed up automatically. Everything still records on-device when you’re off-grid.'}
          </Text>
        </View>

        {mode === 'magic' && (
          <>
            <View style={styles.panel}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={sendLink}
                style={styles.input}
              />
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
            <Pressable onPress={sendLink} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
              <Text style={styles.primaryBtnText}>{busy ? 'SENDING…' : 'EMAIL ME A SIGN-IN LINK'}</Text>
            </Pressable>
            <Pressable onPress={() => { setError(null); setMode('password'); }} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>USE A PASSWORD INSTEAD</Text>
            </Pressable>
          </>
        )}

        {mode === 'sent' && (
          <>
            <View style={styles.panel}>
              <Text style={styles.fieldLabel}>6-DIGIT CODE · OPTIONAL</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                onSubmitEditing={verifyCode}
                placeholder="000000"
                placeholderTextColor={palette.faint}
                style={[styles.input, styles.codeInput]}
              />
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Tapping the link signs you in automatically. The code works too, and doesn’t care
                which device the email opens on.
              </Text>
            </View>
            <Pressable onPress={verifyCode} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
              <Text style={styles.primaryBtnText}>{busy ? 'VERIFYING…' : 'VERIFY CODE'}</Text>
            </Pressable>
            <Pressable onPress={sendLink} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>RESEND LINK</Text>
            </Pressable>
            <Pressable onPress={() => { setError(null); setMode('magic'); }} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>DIFFERENT EMAIL</Text>
            </Pressable>
          </>
        )}

        {mode === 'password' && (
          <>
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
                onSubmitEditing={passwordSignIn}
                style={styles.input}
              />
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
            <Pressable onPress={passwordSignIn} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
              <Text style={styles.primaryBtnText}>{busy ? 'SIGNING IN…' : 'SIGN IN'}</Text>
            </Pressable>
            <Pressable onPress={() => { setError(null); setMode('magic'); }} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>USE A MAGIC LINK INSTEAD</Text>
            </Pressable>
          </>
        )}

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
    fontSize: 13,
    letterSpacing: 3,
    color: palette.orange,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 34,
    letterSpacing: 2,
    color: palette.text,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: palette.textDim,
    lineHeight: 24,
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
    fontSize: 12,
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
    fontSize: 17,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
  },
  hint: {
    backgroundColor: goldTint,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    padding: 12,
  },
  hintText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: palette.gold,
    lineHeight: 21,
  },
  error: {
    marginTop: 12,
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.orange,
    lineHeight: 19,
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
    fontSize: 15,
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
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
