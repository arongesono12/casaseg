import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, RefreshCw } from '@/components/ui/icons';
import { colors, radius, type AppPalette } from '@/constants/theme';
import { fetchConversations, type Conversation } from '@/features/messaging/messaging.api';
import { conversationKeys } from '@/features/messaging/use-messaging-realtime';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

const ConversationRow = memo(function ConversationRow({ conversation, palette }: { conversation: Conversation; palette: AppPalette }) {
  const openConversation = () => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } });
  return (
    <Pressable onPress={openConversation} style={[styles.row, { backgroundColor: palette.surface }]}>
      <View style={styles.icon}><MessageCircle color="white" size={22} /></View>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{conversation.title}</Text>
          {conversation.unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{conversation.unreadCount}</Text></View>}
        </View>
        <Text numberOfLines={1} style={[styles.preview, { color: palette.textSecondary }]}>{conversation.lastMessage}</Text>
      </View>
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
  const renderConversation = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => <ConversationRow conversation={item} palette={palette} />,
    [palette],
  );

  if (!user) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}><View style={styles.center}><MessageCircle color={colors.brand} size={42} /><Text style={[styles.title, { color: palette.text }]}>{t('messages')}</Text><Text style={[styles.emptyCopy, { color: palette.textSecondary }]}>{t('messagesSubtitle')}</Text><Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginButton}><Text style={styles.loginText}>{t('signIn')}</Text></Pressable></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.header}><Text style={[styles.title, { color: palette.text }]}>{t('messages')}</Text><Text style={[styles.subtitle, { color: palette.textSecondary }]}>{t('messagesSubtitle')}</Text></View>
      {conversations.isLoading ? <ActivityIndicator color={colors.brand} size="large" style={styles.center} /> : conversations.isError ? <Pressable onPress={() => void conversations.refetch()} style={styles.center}><RefreshCw color={colors.error} size={26} /><Text style={styles.connectionError}>{t('connectionError')}</Text></Pressable> : (
        <FlatList
          data={conversations.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderConversation}
          ItemSeparatorComponent={ListSeparator}
          ListEmptyComponent={<View style={styles.center}><MessageCircle color={palette.muted} size={38} /><Text style={[styles.emptyTitle, { color: palette.text }]}>{t('noConversations')}</Text><Text style={[styles.emptyCopy, { color: palette.textSecondary }]}>{t('conversationHint')}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, gap: 5 }, title: { fontSize: 28, fontWeight: '900', textAlign: 'center' }, subtitle: { fontSize: 14, lineHeight: 20 }, list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 }, row: { minHeight: 76, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 4 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, name: { flex: 1, fontSize: 16, fontWeight: '800' }, preview: { fontSize: 13 }, badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, badgeText: { color: 'white', fontSize: 11, fontWeight: '900' }, center: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, emptyTitle: { fontSize: 18, fontWeight: '900' }, emptyCopy: { fontSize: 14, textAlign: 'center', lineHeight: 20 }, loginButton: { marginTop: 8, minHeight: 48, borderRadius: 24, backgroundColor: colors.brand, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }, loginText: { color: 'white', fontSize: 15, fontWeight: '900' }, separator: { height: 10 }, connectionError: { color: colors.error, fontWeight: '800' } });
