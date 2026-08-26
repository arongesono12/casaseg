import { ClerkLoaded, ClerkLoading, Show, useClerk, useSignIn, useSignUp, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdaptiveKeyboardView } from '@/components/adaptive-keyboard-view';
import { FormField } from '@/components/form-field';
import { NativeActionButton } from '@/components/native-action-button';
import { colors } from '@/constants/theme';
import { useAppTheme } from '@/providers/theme-context';

/**
 * Pantalla de verificación de la integración con Clerk.
 *
 * Es independiente del inicio de sesión de Supabase que usa el resto de la app:
 * sirve para dar de alta el primer usuario de Clerk y comprobar que las claves,
 * el ClerkProvider y el token cache funcionan de extremo a extremo.
 */
export default function ClerkDemoScreen() {
  const { palette } = useAppTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <AdaptiveKeyboardView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <Text style={[styles.title, { color: palette.text }]}>Clerk</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Pantalla de prueba de la integración. No afecta al inicio de sesión de Supabase.
            </Text>
          </View>

          <ClerkLoading>
            <ActivityIndicator color={colors.brand} style={styles.loading} />
          </ClerkLoading>

          <ClerkLoaded>
            <Show when="signed-out">
              <SignedOutPanel />
            </Show>
            <Show when="signed-in">
              <SignedInPanel />
            </Show>
          </ClerkLoaded>

          <Pressable accessibilityRole="link" onPress={() => router.back()} style={styles.inlineTarget}>
            <Text style={styles.link}>Volver</Text>
          </Pressable>
        </ScrollView>
      </AdaptiveKeyboardView>
    </SafeAreaView>
  );
}

function SignedOutPanel() {
  const { palette } = useAppTheme();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = Boolean(signIn) && Boolean(signUp);

  const run = (action: () => Promise<void>) => {
    if (busy || !ready) return;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    void action()
      .catch((cause: unknown) => setError(describeError(cause)))
      .finally(() => setBusy(false));
  };

  const startSignUp = () => run(async () => {
    if (!signUp) return;

    const created = await signUp.password({ emailAddress: email, password });
    if (created.error) {
      setError(describeError(created.error));
      return;
    }

    // Si la instancia no exige verificar el correo, la cuenta ya está lista.
    if (signUp.status === 'complete') {
      const finalized = await signUp.finalize();
      if (finalized.error) setError(describeError(finalized.error));
      return;
    }

    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setError(describeError(sent.error));
      return;
    }

    setAwaitingCode(true);
  });

  const confirmSignUp = () => run(async () => {
    if (!signUp) return;

    const verified = await signUp.verifications.verifyEmailCode({ code });
    if (verified.error) {
      setError(describeError(verified.error));
      return;
    }

    if (signUp.status !== 'complete') {
      setError('La verificación no se completó. Revisa el código e inténtalo de nuevo.');
      return;
    }

    const finalized = await signUp.finalize();
    if (finalized.error) {
      setError(describeError(finalized.error));
      return;
    }

    setAwaitingCode(false);
  });

  const submitSignIn = () => run(async () => {
    if (!signIn) return;

    const attempt = await signIn.password({ identifier: email, password });
    if (attempt.error) {
      setError(describeError(attempt.error));
      return;
    }

    if (signIn.status !== 'complete') {
      setError('Se requieren pasos adicionales para completar el inicio de sesión.');
      return;
    }

    const finalized = await signIn.finalize();
    if (finalized.error) setError(describeError(finalized.error));
  });

  const switchMode = (next: 'sign-in' | 'sign-up') => {
    setMode(next);
    setAwaitingCode(false);
    setError('');
    setCode('');
  };

  if (awaitingCode) {
    return (
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, { color: palette.text }]}>Confirma tu correo</Text>
        <Text style={[styles.panelHint, { color: palette.textSecondary }]}>
          Hemos enviado un código de 6 dígitos a {email}.
        </Text>
        <FormField
          label="Código de verificación"
          placeholder="123456"
          autoCapitalize="none"
          autoComplete="one-time-code"
          autoCorrect={false}
          keyboardType="number-pad"
          returnKeyType="done"
          textContentType="oneTimeCode"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={confirmSignUp}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <NativeActionButton disabled={busy || !ready} label={busy ? 'Verificando...' : 'Verificar'} onPress={confirmSignUp} />
        <Pressable accessibilityRole="link" onPress={() => switchMode('sign-up')} style={styles.inlineTarget}>
          <Text style={styles.link}>Usar otro correo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={[styles.tabs, { borderColor: palette.border }]}>
        <ModeTab active={mode === 'sign-up'} label="Crear cuenta" onPress={() => switchMode('sign-up')} />
        <ModeTab active={mode === 'sign-in'} label="Iniciar sesión" onPress={() => switchMode('sign-in')} />
      </View>

      <FormField
        label="Correo electrónico"
        placeholder="tu@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="next"
        spellCheck={false}
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <FormField
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        autoCapitalize="none"
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        autoCorrect={false}
        returnKeyType="done"
        secureTextEntry
        spellCheck={false}
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={mode === 'sign-up' ? startSignUp : submitSignIn}
      />

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <NativeActionButton
        disabled={busy || !ready}
        label={busy ? 'Procesando...' : mode === 'sign-up' ? 'Crear cuenta en Clerk' : 'Iniciar sesión con Clerk'}
        onPress={mode === 'sign-up' ? startSignUp : submitSignIn}
      />
    </View>
  );
}

function SignedInPanel() {
  const { palette } = useAppTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.panel}>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>Sesión de Clerk activa</Text>
        <Text style={[styles.cardValue, { color: palette.text }]}>
          {user?.primaryEmailAddress?.emailAddress ?? user?.id ?? 'Sin correo'}
        </Text>
      </View>
      <NativeActionButton
        disabled={busy}
        label={busy ? 'Cerrando...' : 'Cerrar sesión de Clerk'}
        onPress={() => {
          setBusy(true);
          void signOut().finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

function ModeTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { palette } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: colors.brand }]}
    >
      <Text style={[styles.tabLabel, { color: active ? 'white' : palette.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Los métodos del API `Future` de Clerk devuelven `{ error }` en vez de lanzar,
 * así que aceptamos ambas formas: el `ClerkError` devuelto y cualquier excepción.
 */
function describeError(cause: unknown) {
  if (cause instanceof Error) {
    const longMessage = (cause as { longMessage?: string }).longMessage;
    return longMessage ?? cause.message;
  }

  return 'Error de conexión';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, gap: 16, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  heading: { gap: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 21 },
  loading: { paddingVertical: 32 },
  panel: { gap: 16 },
  panelTitle: { fontSize: 20, fontWeight: '600' },
  panelHint: { fontSize: 14, lineHeight: 20 },
  tabs: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, gap: 4, padding: 16 },
  cardLabel: { fontSize: 13 },
  cardValue: { fontSize: 17, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 14 },
  link: { color: colors.brandDark, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  inlineTarget: { alignSelf: 'center', paddingVertical: 8 },
});
