import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Home, KeyRound, Layers3, ShieldCheck, UsersRound } from '@/components/ui/icons';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CasasegLogo } from '@/components/ui/casaseg-logo';
import { colors, radius } from '@/constants/theme';
import { appStorage } from '@/lib/local-storage';
import { useAppTheme } from '@/providers/theme-context';

const slides = [
  { id: 'start', eyebrow: 'Un hogar para cada historia', title: 'Empieza a buscar\ntu nuevo hogar', body: 'Encuentra alquileres verificados en Guinea Ecuatorial, de forma sencilla y segura.' },
  { id: 'discover', eyebrow: 'Explora sin límites', title: 'Encuentra el lugar\nque encaja contigo', body: 'Compara viviendas, guarda tus favoritas y solicita una visita desde un solo lugar.' },
  { id: 'trust', eyebrow: 'Una comunidad segura', title: 'Confianza en cada\npaso del camino', body: 'Conectamos a inquilinos y propietarios verificados para que decidas con tranquilidad.' },
] as const;

type Slide = (typeof slides)[number];

const trustStats = [
  { Icon: Home, value: '16', label: 'Propiedades' },
  { Icon: UsersRound, value: '+10', label: 'Usuarios' },
  { Icon: Layers3, value: '3', label: 'Planes' },
];

function finishOnboarding() {
  appStorage.setItem('casaseg.onboarding.seen', 'true');
  router.replace('/(tabs)/explore');
}

function Brand({ textColor }: { textColor: string }) {
  return <View style={styles.brand}><CasasegLogo width={38} height={32} /><Text style={[styles.brandName, { color: textColor }]}>CASASEG</Text></View>;
}

function StartArtwork({ dark }: { dark: boolean }) {
  return <View style={[styles.artwork, dark && { backgroundColor: '#122338' }]}><View style={styles.sun} /><View style={[styles.cloud, { left: 20, top: 54 }]} /><View style={[styles.cloud, { right: 16, top: 86 }]} />
    <View style={styles.house}><View style={styles.roof} /><View style={styles.houseBody}><View style={styles.windowRow}><View style={styles.window} /><View style={styles.window} /></View><View style={styles.door}><KeyRound size={16} color="white" /></View></View></View>
    <View style={styles.people}><View style={[styles.person, { backgroundColor: '#EF6B72' }]} /><View style={[styles.person, { backgroundColor: colors.primary }]} /></View>
  </View>;
}

function DiscoverArtwork({ dark }: { dark: boolean }) {
  return <View style={[styles.propertyCard, dark && { backgroundColor: '#171717' }]}><LinearGradient colors={dark ? ['#19324A', '#111827'] : ['#BFE8F2', '#EEF7F8']} style={styles.propertySky}><View style={styles.miniSun} /><View style={styles.modernHouse}><View style={styles.modernTop} /><View style={styles.modernBody}><View style={styles.glass} /><View style={styles.modernDoor} /><View style={styles.glass} /></View></View><View style={styles.lawn} /></LinearGradient><View style={styles.propertyMeta}><View><Text style={[styles.propertyTitle, dark && { color: '#F8FAFC' }]}>Villa luminosa</Text><Text style={[styles.propertyPlace, dark && { color: '#CBD5E1' }]}>Malabo · 3 habitaciones</Text></View><View style={[styles.pricePill, dark && { backgroundColor: '#172554' }]}><Text style={styles.price}>450.000 XAF</Text></View></View></View>;
}

function TrustArtwork({ dark }: { dark: boolean }) {
  return <View style={[styles.trustCard, dark && { backgroundColor: '#171717' }]}><View style={[styles.shield, dark && { backgroundColor: '#172554' }]}><ShieldCheck size={34} color={colors.brand} /></View><Text style={[styles.trustTitle, dark && { color: '#F8FAFC' }]}>Comunidad CasaSeg</Text><View style={styles.stats}>{trustStats.map(({ Icon, value, label }, i) => <View key={label} style={[styles.stat, i > 0 && styles.statBorder]}><Icon size={23} color={colors.primary} /><Text style={[styles.statValue, dark && { color: '#F8FAFC' }]}>{value}</Text><Text style={[styles.statLabel, dark && { color: '#CBD5E1' }]}>{label}</Text></View>)}</View><View style={[styles.verified, dark && { backgroundColor: '#222222' }]}><View style={styles.avatarStack}>{['#1D4ED8', '#2563EB', '#E76F51'].map((color, i) => <View key={color} style={[styles.avatar, { backgroundColor: color, marginLeft: i ? -9 : 0 }]}><Text style={styles.avatarText}>{['A','M','J'][i]}</Text></View>)}</View><Text style={[styles.verifiedText, dark && { color: '#CBD5E1' }]}>Perfiles verificados</Text></View></View>;
}

function SlideView({ item, width, dark }: { item: Slide; width: number; dark: boolean }) {
  const textColor = dark ? '#F8FAFC' : colors.text;
  return <View style={[styles.slide, { width }]}><Brand textColor={textColor} /><View style={styles.copy}><Text style={[styles.eyebrow, dark && { color: '#60A5FA' }]}>{item.eyebrow}</Text><Text style={[styles.title, { color: textColor }]}>{item.title}</Text><Text style={[styles.body, dark && { color: '#CBD5E1' }]}>{item.body}</Text></View><View style={styles.visual}>{item.id === 'start' ? <StartArtwork dark={dark} /> : item.id === 'discover' ? <DiscoverArtwork dark={dark} /> : <TrustArtwork dark={dark} />}</View></View>;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedMode, palette } = useAppTheme();
  const dark = resolvedMode === 'dark';
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 520);
  const [current, setCurrent] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const renderSlide = useCallback<ListRenderItem<Slide>>(({ item }) => <SlideView item={item} width={pageWidth} dark={dark} />, [dark, pageWidth]);
  const next = () => current === slides.length - 1 ? finishOnboarding() : list.current?.scrollToIndex({ index: current + 1, animated: true });

  return <LinearGradient colors={dark ? ['#07111F', palette.background, '#160E16'] : ['#F2FCFC', '#FFFFFF', '#FFF2F3']} locations={[0, .55, 1]} style={styles.container}>
    <FlatList ref={list} data={slides} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} style={[styles.slides, { width: pageWidth, marginTop: insets.top + 18 }]} renderItem={renderSlide} keyExtractor={item => item.id} onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / pageWidth))} />
    <View style={[styles.footer, { width: pageWidth, paddingBottom: Math.max(insets.bottom, 16) }]}><View style={styles.dots}>{slides.map((slide, i) => <View key={slide.id} style={[styles.dot, dark && { backgroundColor: '#475569' }, i === current && styles.dotActive]} />)}</View><Pressable onPress={next} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{current === slides.length - 1 ? 'Explorar propiedades' : current === 0 ? 'Comenzar' : 'Siguiente'}</Text><ArrowRight size={20} color="white" /></Pressable>{current === 0 ? <Pressable onPress={() => router.push('/(auth)/login')} style={styles.textButton}><Text style={[styles.textButtonLabel, dark && { color: '#CBD5E1' }]}>¿Ya tienes cuenta? <Text style={styles.signIn}>Inicia sesión</Text></Text></Pressable> : <Pressable onPress={finishOnboarding} style={styles.textButton}><Text style={[styles.skip, dark && { color: '#60A5FA' }]}>Saltar</Text></Pressable>}</View>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' }, slides: { flex: 1 }, slide: { flex: 1, paddingHorizontal: 28 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandName: { fontSize: 20, fontWeight: '900', letterSpacing: .5, color: colors.text }, copy: { marginTop: 32 }, eyebrow: { color: colors.brandDark, fontSize: 14, fontWeight: '800', letterSpacing: .7, textTransform: 'uppercase', marginBottom: 10 }, title: { color: colors.text, fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1.3 }, body: { marginTop: 14, maxWidth: 420, color: colors.textSecondary, fontSize: 16, lineHeight: 24 }, visual: { flex: 1, minHeight: 250, justifyContent: 'center', paddingVertical: 22 },
  artwork: { height: 270, borderRadius: radius.hero, backgroundColor: '#E9F7F7', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' }, sun: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFD9C9', right: 20, top: 20 }, cloud: { position: 'absolute', width: 58, height: 15, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.85)' }, house: { width: 210, alignItems: 'center' }, roof: { width: 160, height: 90, backgroundColor: '#D8E8F0', transform: [{ rotate: '45deg' }], position: 'absolute', top: -52, borderRadius: 8, borderWidth: 2, borderColor: '#31536B' }, houseBody: { width: 205, height: 145, backgroundColor: '#FAFDFD', borderWidth: 2, borderColor: '#31536B', paddingTop: 30, alignItems: 'center' }, windowRow: { flexDirection: 'row', gap: 52 }, window: { width: 31, height: 39, backgroundColor: '#BDE4EE', borderWidth: 2, borderColor: '#31536B' }, door: { width: 42, height: 62, backgroundColor: '#31536B', marginTop: 14, alignItems: 'center', justifyContent: 'center' }, people: { position: 'absolute', right: 32, bottom: 16, flexDirection: 'row', gap: 5 }, person: { width: 25, height: 65, borderRadius: 18 },
  propertyCard: { borderRadius: radius.xl, backgroundColor: 'white', overflow: 'hidden', boxShadow: '0 10px 20px rgba(16,42,67,0.13)' }, propertySky: { height: 205, justifyContent: 'flex-end', alignItems: 'center' }, miniSun: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFE2A8', top: 22, right: 28 }, modernHouse: { width: '84%' }, modernTop: { width: '100%', height: 24, backgroundColor: '#F7FAFC', borderWidth: 2, borderColor: '#34495E' }, modernBody: { height: 104, backgroundColor: '#F5EEE7', borderWidth: 2, borderTopWidth: 0, borderColor: '#34495E', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 14 }, glass: { width: '28%', height: 67, backgroundColor: '#9FD7E5', borderWidth: 2, borderColor: '#34495E' }, modernDoor: { width: '24%', height: 82, backgroundColor: '#263747' }, lawn: { height: 25, width: '100%', backgroundColor: '#83B96A' }, propertyMeta: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, propertyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, propertyPlace: { color: colors.textSecondary, fontSize: 12, marginTop: 4 }, pricePill: { backgroundColor: '#E8F7F5', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 }, price: { color: colors.brandDark, fontWeight: '800', fontSize: 11 },
  trustCard: { backgroundColor: 'white', borderRadius: radius.hero, padding: 20, alignItems: 'center', boxShadow: '0 8px 24px rgba(196,88,101,0.10)' }, shield: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E8F7F5', alignItems: 'center', justifyContent: 'center' }, trustTitle: { fontSize: 19, fontWeight: '900', color: colors.text, marginTop: 10 }, stats: { flexDirection: 'row', marginTop: 20, width: '100%' }, stat: { flex: 1, alignItems: 'center', gap: 3 }, statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border }, statValue: { fontSize: 23, fontWeight: '900', color: colors.text }, statLabel: { color: colors.textSecondary, fontSize: 11 }, verified: { flexDirection: 'row', alignItems: 'center', marginTop: 21, backgroundColor: colors.background, borderRadius: radius.pill, padding: 8, paddingRight: 14 }, avatarStack: { flexDirection: 'row' }, avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: 'white', fontWeight: '800', fontSize: 11 }, verifiedText: { marginLeft: 9, fontWeight: '700', color: colors.textSecondary, fontSize: 12 },
  footer: { paddingHorizontal: 28, alignItems: 'center' }, dots: { flexDirection: 'row', gap: 7, marginBottom: 16 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD5E1' }, dotActive: { width: 24, backgroundColor: colors.brand }, button: { height: 56, width: '100%', borderRadius: radius.pill, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 7px 14px rgba(37,99,235,0.25)' }, pressed: { opacity: .86, transform: [{ scale: .99 }] }, buttonText: { color: 'white', fontSize: 16, fontWeight: '800' }, textButton: { height: 46, justifyContent: 'center', paddingHorizontal: 12 }, textButtonLabel: { color: colors.textSecondary, fontSize: 14 }, signIn: { color: colors.primary, fontWeight: '800' }, skip: { color: colors.brandDark, fontWeight: '800', fontSize: 14 },
});
