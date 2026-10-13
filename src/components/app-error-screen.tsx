import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { AlertCircle, Building2, Calendar, Home, Lock, MessageCircle, RefreshCw, Search, UserRound, Wifi, type AppIcon } from '@/components/ui/icons';
import { PremiumButton } from '@/components/ui/premium';
import { fontFamily, radius, typography } from '@/constants/theme';
import { defineCopy, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export type AppErrorKind = 'route' | 'property' | 'profile' | 'conversation' | 'visit' | 'meeting' | 'access' | 'network' | 'unexpected';

const errorIcons: Record<AppErrorKind, AppIcon> = {
  route: Search,
  property: Building2,
  profile: UserRound,
  conversation: MessageCircle,
  visit: Calendar,
  meeting: Calendar,
  access: Lock,
  network: Wifi,
  unexpected: AlertCircle,
};

const errorCopy = defineCopy({
  es: {
    routeTitle: 'Esta página no existe', routeBody: 'El enlace puede estar incompleto o la página pudo cambiar de dirección.',
    propertyTitle: 'Vivienda no disponible', propertyBody: 'La vivienda ya no está publicada o el enlace ha dejado de estar disponible.',
    profileTitle: 'Perfil no disponible', profileBody: 'Este perfil no existe o su propietario ha decidido mantenerlo privado.',
    conversationTitle: 'Conversación no disponible', conversationBody: 'No encontramos esta conversación o ya no tienes acceso a ella.',
    visitTitle: 'Visita no disponible', visitBody: 'No encontramos la vivienda de esta visita. Puedes explorar otras opciones.',
    meetingTitle: 'Encuentro no disponible', meetingBody: 'No encontramos este encuentro o ya no puedes consultarlo.',
    accessTitle: 'Acceso restringido', accessBody: 'Tu cuenta no tiene permiso para abrir este contenido.',
    networkTitle: 'No pudimos cargar esta página', networkBody: 'Comprueba tu conexión e inténtalo de nuevo.',
    unexpectedTitle: 'Algo ha fallado', unexpectedBody: 'La pantalla no se pudo mostrar. Inténtalo de nuevo.',
    home: 'Ir al inicio', back: 'Volver', retry: 'Reintentar',
  },
  fr: {
    routeTitle: 'Cette page n’existe pas', routeBody: 'Le lien est peut-être incomplet ou la page a changé d’adresse.',
    propertyTitle: 'Logement indisponible', propertyBody: 'Ce logement n’est plus publié ou le lien n’est plus disponible.',
    profileTitle: 'Profil indisponible', profileBody: 'Ce profil n’existe pas ou son propriétaire a choisi de le garder privé.',
    conversationTitle: 'Conversation indisponible', conversationBody: 'Nous ne trouvons pas cette conversation ou vous n’y avez plus accès.',
    visitTitle: 'Visite indisponible', visitBody: 'Nous ne trouvons pas le logement de cette visite. Vous pouvez découvrir d’autres options.',
    meetingTitle: 'Rencontre indisponible', meetingBody: 'Nous ne trouvons pas cette rencontre ou vous ne pouvez plus la consulter.',
    accessTitle: 'Accès restreint', accessBody: 'Votre compte n’a pas accès à ce contenu.',
    networkTitle: 'Impossible de charger cette page', networkBody: 'Vérifiez votre connexion et réessayez.',
    unexpectedTitle: 'Une erreur est survenue', unexpectedBody: 'Impossible d’afficher cet écran. Réessayez.',
    home: 'Aller à l’accueil', back: 'Retour', retry: 'Réessayer',
  },
  en: {
    routeTitle: 'This page does not exist', routeBody: 'The link may be incomplete or the page may have moved.',
    propertyTitle: 'Home unavailable', propertyBody: 'This home is no longer listed or its link is unavailable.',
    profileTitle: 'Profile unavailable', profileBody: 'This profile does not exist or its owner has chosen to keep it private.',
    conversationTitle: 'Conversation unavailable', conversationBody: 'We could not find this conversation or you no longer have access to it.',
    visitTitle: 'Visit unavailable', visitBody: 'We could not find the home for this visit. You can explore other options.',
    meetingTitle: 'Meeting unavailable', meetingBody: 'We could not find this meeting or you can no longer view it.',
    accessTitle: 'Access restricted', accessBody: 'Your account cannot open this content.',
    networkTitle: 'Could not load this page', networkBody: 'Check your connection and try again.',
    unexpectedTitle: 'Something went wrong', unexpectedBody: 'This screen could not be shown. Please try again.',
    home: 'Go to home', back: 'Go back', retry: 'Try again',
  },
});

type Props = {
  kind: AppErrorKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: Href;
  showNavigation?: boolean;
};

/** Shared error illustration and actions for unknown routes and unavailable resources. */
export function AppErrorContent({ kind, title, description, onRetry, homeHref = '/(tabs)/explore', showNavigation = true }: Props) {
  const copy = useCopy(errorCopy);
  const { palette } = useAppTheme();
  const Icon = errorIcons[kind];
  const canGoBack = showNavigation && router.canGoBack();
  const goHome = () => router.replace(homeHref);
  const heading = title ?? copy[`${kind}Title`];
  const body = description ?? copy[`${kind}Body`];

  return (
    <View style={styles.content}>
      <View style={styles.brand}><CasasegLogo width={31} /><Text style={[styles.brandName, { color: palette.text }]}>CasasEG</Text></View>
      <View style={[styles.iconFrame, { backgroundColor: palette.brandSoft, borderColor: palette.border }]}>
        <Icon color={palette.brandIcon} size={42} strokeWidth={1.7} />
      </View>
      {kind === 'route' ? <Text style={[styles.code, { color: palette.brandIcon }]}>404</Text> : null}
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{heading}</Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>{body}</Text>
      <View style={styles.actions}>
        <PremiumButton label={onRetry ? copy.retry : copy.home} icon={onRetry ? RefreshCw : Home} onPress={onRetry ?? goHome} style={styles.action} />
        {canGoBack ? <PremiumButton label={copy.back} variant="secondary" onPress={() => router.back()} style={styles.action} /> : onRetry && showNavigation ? <PremiumButton label={copy.home} variant="secondary" onPress={goHome} style={styles.action} /> : null}
      </View>
    </View>
  );
}

export function AppErrorScreen(props: Props) {
  const { palette } = useAppTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppErrorContent {...props} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 36 },
  brandName: { fontFamily: fontFamily.bold, fontSize: 16, letterSpacing: -0.3 },
  iconFrame: { width: 104, height: 104, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  code: { fontFamily: fontFamily.extrabold, fontSize: 54, lineHeight: 62, letterSpacing: -2, marginBottom: 4 },
  title: { ...typography.title, textAlign: 'center' },
  description: { ...typography.body, textAlign: 'center', marginTop: 12, maxWidth: 360 },
  actions: { width: '100%', gap: 10, marginTop: 32 },
  action: { width: '100%' },
});
