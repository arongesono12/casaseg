import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRight, Lock, MessageCircle, MessagesSquare, Sparkles } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, PremiumHero, SectionTitle, StatusPill } from '@/components/ui/premium';
import { colors, radius, type AppPalette } from '@/constants/theme';
import { fetchConversations, type Conversation } from '@/features/messaging/messaging.api';
import { conversationKeys } from '@/features/messaging/use-messaging-realtime';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const ConversationRow = memo(function ConversationRow({ conversation, palette }: { conversation: Conversation; palette: AppPalette }) {
  const openConversation = () => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } });
  const initial = conversation.title.trim().charAt(0).toUpperCase() || 'C';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversación ${conversation.title}`}
      onPress={openConversation}
      style={({ pressed }) => [styles.row, { backgroundColor: palette.surface, borderColor: conversation.unreadCount > 0 ? `${colors.brand}35` : palette.border }, pressed && styles.pressed]}
    >
      <LinearGradient colors={conversation.unreadCount > 0 ? ['#1D4ED8', '#60A5FA'] : ['#334155', '#64748B']} style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </LinearGradient>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{conversation.title}</Text>
          {conversation.unreadCount > 0 ? <StatusPill label={`${conversation.unreadCount} nueva${conversation.unreadCount > 1 ? 's' : ''}`} tone={colors.brand} /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.preview, { color: palette.textSecondary }]}>{conversation.lastMessage}</Text>
      </View>
      <ChevronRight color={palette.muted} size={21} />
    </Pressable>
  );
});

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();
  const conversations = useQuery({ queryKey: conversationKeys.list(user?.id ?? 'guest'), queryFn: fetchConversations, enabled: Boolean(user) });
  const unreadTotal = useMemo(() => (conversations.data ?? []).reduce((total, item) => total + item.unreadCount, 0), [conversations.data]);
  const renderConversation = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => <ConversationRow conversation={item} palette={palette} />,
    [palette],
  );

  const listHeader = (
    <View style={styles.header}>
      <PremiumHero title={t('messages')} description={t('messagesSubtitle')} eyebrow="CONVERSACIONES SEGURAS" icon={Lock} />
      <SectionTitle
        title="Bandeja de entrada"
        detail="Consultas sobre propiedades, visitas y contratos."
        action={unreadTotal > 0 ? <StatusPill label={`${unreadTotal} sin leer`} tone={colors.brand} icon={MessageCircle} /> : undefined}
      />
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
        <View style={styles.guestContent}>
          <PremiumHero title={t('messages')} description={t('messagesSubtitle')} eyebrow="CONVERSACIONES SEGURAS" icon={Lock} />
          <PremiumEmptyState icon={MessageCircle} title="Habla directamente con propietarios" description="Inicia sesión para resolver dudas, coordinar visitas y conservar el historial de cada propiedad." actionLabel={t('signIn')} onAction={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: palette.background }]}>
      <FlatList
        data={conversations.isLoading || conversations.isError ? [] : conversations.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderConversation}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={conversations.isLoading
          ? <PremiumEmptyState icon={Sparkles} title="Abriendo tus conversaciones" description="Estamos recuperando tus mensajes de forma segura." loading />
          : conversations.isError
            ? <PremiumErrorState title="No pudimos abrir la bandeja" description={t('connectionError')} onRetry={() => void conversations.refetch()} />
            : <PremiumEmptyState icon={MessagesSquare} title={t('noConversations')} description={t('conversationHint')} actionLabel="Explorar propiedades" onAction={() => router.push('/(tabs)/explore')} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 130 },
  guestContent: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 120, gap: 20 },
  header: { gap: 22, paddingTop: 8, paddingBottom: 18 },
  row: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 8px 22px rgba(15,23,42,0.05)' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontSize: 19, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '900' },
  preview: { fontSize: 13, lineHeight: 18 },
  separator: { height: 10 },
});
