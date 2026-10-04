import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBarScrim } from '@/components/status-bar-scrim';
import { ArrowLeft, Building2, Calendar, ChevronRight, CreditCard, Crown, FileText, Plus, ShieldCheck } from '@/components/ui/icons';
import { CircleButton, LargeTitle, PremiumButton, StatusPill } from '@/components/ui/premium';
import { UserAvatar } from '@/components/user-avatar';
import { fontFamily, radius, spacing, type AppPalette } from '@/constants/theme';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchOwnerVisitRequests, visitRequestKeys, type VisitRequest } from '@/features/properties/api/visit-requests';
import { useOwnerProperties } from '@/features/owner/use-owner-properties';
import { pressRipple } from '@/lib/press-feedback';
import { useAuth } from '@/providers/auth-context';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate, formatXaf } from '@/utils/formatters';

const ownerHomeCopy = defineCopy({
  es: { propertiesDetail: 'Edita, publica y controla el estado de tus anuncios.', requestsDetail: 'Revisa y responde solicitudes de visita.', paymentsDetail: 'Consulta operaciones y cobros confirmados.', contractsDetail: 'Gestiona documentos, versiones y firmas.', subscriptionDetail: 'Mejora la visibilidad y tus herramientas.', professional: 'Profesional', properties: 'Propiedades', pendingVisits: 'Visitas pendientes', completedPayments: 'Pagos completados', newListing: 'NUEVA PUBLICACIÓN', createDetail: 'Crea un anuncio atractivo con fotos, características y precio.', hubTitle: 'Centro de gestión' },
  fr: { propertiesDetail: 'Modifiez, publiez et suivez le statut de vos annonces.', requestsDetail: 'Consultez les demandes de visite et répondez-y.', paymentsDetail: 'Consultez les opérations et encaissements confirmés.', contractsDetail: 'Gérez documents, versions et signatures.', subscriptionDetail: 'Améliorez votre visibilité et vos outils.', professional: 'Professionnel', properties: 'Logements', pendingVisits: 'Visites en attente', completedPayments: 'Paiements terminés', newListing: 'NOUVELLE ANNONCE', createDetail: 'Créez une annonce attrayante avec photos, caractéristiques et prix.', hubTitle: 'Centre de gestion' },
  en: { propertiesDetail: 'Edit, publish and track the status of your listings.', requestsDetail: 'Review and answer visit requests.', paymentsDetail: 'See transactions and confirmed payouts.', contractsDetail: 'Manage documents, versions and signatures.', subscriptionDetail: 'Boost your visibility and tools.', professional: 'Professional', properties: 'Properties', pendingVisits: 'Pending visits', completedPayments: 'Completed payments', newListing: 'NEW LISTING', createDetail: 'Create an attractive listing with photos, features and price.', hubTitle: 'Management hub' },
});

type ManageLink = { label: string; href: Href; icon: typeof Building2; badge?: string };

const isPending = (request: VisitRequest) => request.status === 'pending';
const isConfirmed = (request: VisitRequest) => request.status === 'accepted';

/** Panel de propietario del rediseño B: saludo, solicitudes en carrusel, viviendas y accesos. */
export default function OwnerHome() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t, locale } = useI18n();
  const copy = useCopy(ownerHomeCopy);
  const insets = useSafeAreaInsets();
  const properties = useOwnerProperties();
  // visit_requests.owner_id guarda el uuid de public.users, no el id de Clerk.
  const profileId = useProfileId();
  const requests = useQuery({ queryKey: visitRequestKeys.owner(profileId ?? 'pending'), queryFn: () => fetchOwnerVisitRequests(profileId!), enabled: Boolean(profileId) });
  const [view, setView] = useState<'pending' | 'confirmed'>('pending');
  const pending = (requests.data ?? []).filter(isPending);
  const confirmed = (requests.data ?? []).filter(isConfirmed);
  const shown = view === 'pending' ? pending : confirmed;
  const firstName = user?.name.trim().split(/\s+/)[0] ?? '';

  const links: ManageLink[] = [
    { label: t('myProperties'), href: '/owner/properties', icon: Building2 },
    { label: t('requests'), href: '/owner/requests' as Href, icon: Calendar },
    { label: t('payments'), href: '/owner/payments', icon: CreditCard },
    { label: t('contracts'), href: '/owner/contracts', icon: FileText },
    { label: t('subscription'), href: '/owner/subscription', icon: Crown, badge: copy.professional },
  ];

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.page}>
          <LargeTitle
            title={firstName ? t('greeting', { name: firstName }) : t('ownerPanel')}
            leading={<CircleButton label={t('back')} onPress={() => router.back()}><ArrowLeft color={palette.text} size={21} /></CircleButton>}
            accessory={
              <View style={styles.mode}>
                <Text style={[styles.modeText, { color: palette.textSecondary }]}>{t('ownerMode')}</Text>
                {user ? <UserAvatar name={user.name} uri={user.avatar} size={36} /> : null}
              </View>
            }
          />

          <View accessibilityRole="tablist" style={styles.segments}>
            {([['pending', t('pendingCount', { count: String(pending.length) })], ['confirmed', t('confirmedVisits')]] as const).map(([key, label]) => {
              const selected = view === key;
              return (
                <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected }} android_ripple={pressRipple} onPress={() => setView(key)} style={({ pressed }) => [styles.segment, { borderColor: selected ? palette.brand : palette.border, backgroundColor: selected ? palette.brand : palette.surface }, pressed && styles.pressed]}>
                  <Text style={[styles.segmentText, { color: selected ? 'white' : palette.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {shown.length ? shown.map((request) => (
            <Pressable key={request.id} accessibilityRole="button" android_ripple={pressRipple} onPress={() => router.push('/owner/requests' as Href)} style={({ pressed }) => [styles.requestCard, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}>
              <Text style={[styles.requestKind, { color: palette.brandText }]}>{isPending(request) ? t('visitRequestLabel') : t('visitConfirmedLabel')}</Text>
              <Text numberOfLines={2} style={[styles.requestTitle, { color: palette.text }]}>{request.propertyTitle}</Text>
              <Text style={[styles.caption, { color: palette.textSecondary }]}>{formatDate(request.proposedAt, locale)}</Text>
            </Pressable>
          )) : (
            <View style={[styles.requestCard, styles.emptyCard, { borderColor: palette.border }]}>
              <Text style={[styles.caption, { color: palette.textSecondary }]}>{requests.isLoading ? t('loading') : t('noVisitRequests')}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.page}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{t('yourHomes')}</Text>
          <View style={styles.homes}>
            {(properties.data ?? []).map((property) => {
              const verified = property.legalStatus === 'verified';
              return (
                <Pressable key={property.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/owner/property/[id]', params: { id: property.id } })} style={({ pressed }) => [styles.home, pressed && styles.pressed]}>
                  <Image source={{ uri: property.imageUrls[0] }} contentFit="cover" style={[styles.homeImage, { backgroundColor: palette.subtle }]} />
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={[styles.homeTitle, { color: palette.text }]}>{property.title}</Text>
                    <View style={styles.homeStatus}>
                      <ShieldCheck color={verified ? palette.brandIcon : palette.textSecondary} size={15} />
                      <Text style={[styles.caption, { color: verified ? palette.brandText : palette.textSecondary }]}>{t(verified ? 'legalVerified' : property.legalStatus === 'pending' ? 'legalPending' : 'legalRestricted')}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.caption, { color: palette.textSecondary }]}>{formatXaf(property.price, property.priceType, locale)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <PremiumButton label={t('publishHome')} icon={Plus} variant="secondary" onPress={() => router.push('/owner/property/create')} />

          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{copy.hubTitle}</Text>
          <View style={[styles.links, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            {links.map((link, index) => <ManageRow key={String(link.href)} link={link} palette={palette} first={index === 0} />)}
          </View>
        </View>
      </ScrollView>
      <StatusBarScrim />
    </SafeAreaView>
  );
}

function ManageRow({ link, palette, first }: { link: ManageLink; palette: AppPalette; first: boolean }) {
  const Icon = link.icon;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={link.label} android_ripple={pressRipple} onPress={() => router.push(link.href)} style={({ pressed }) => [styles.link, !first && { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth }, pressed && { backgroundColor: palette.subtle }]}>
      <Icon color={palette.text} size={22} />
      <Text style={[styles.linkText, { color: palette.text }]}>{link.label}</Text>
      {link.badge ? <StatusPill label={link.badge} tone={palette.brandIcon} /> : null}
      <ChevronRight color={palette.textSecondary} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: spacing.xl },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.xxl, gap: spacing.xl },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeText: { fontSize: 14, fontFamily: fontFamily.semibold },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { minHeight: 40, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center', overflow: 'hidden' },
  segmentText: { fontSize: 14, fontFamily: fontFamily.semibold },
  cards: { gap: 12, paddingHorizontal: spacing.xxl },
  requestCard: { width: 250, minHeight: 128, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', padding: 16, gap: 6, overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,0.06)' },
  emptyCard: { justifyContent: 'center', boxShadow: 'none', borderStyle: 'dashed', borderWidth: 1 },
  requestKind: { fontSize: 13, fontFamily: fontFamily.bold },
  requestTitle: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.bold },
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.bold, marginTop: spacing.sm },
  homes: { gap: spacing.lg },
  home: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  homeImage: { width: 88, height: 88, borderRadius: radius.md },
  homeTitle: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily.bold },
  homeStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  links: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  link: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  linkText: { fontFamily: fontFamily.regular, flex: 1, fontSize: 16 },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  pressed: { opacity: 0.76 },
});
