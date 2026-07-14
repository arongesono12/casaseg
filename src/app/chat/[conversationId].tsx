import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, UserRound } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';
import { fetchMessages, markConversationRead, sendMessage, type ChatMessage } from '@/features/messaging/messaging.api';
import { conversationKeys, useActiveConversationRealtime } from '@/features/messaging/use-messaging-realtime';
import { useAuth } from '@/providers/auth-provider';
import { useI18n } from '@/providers/i18n-provider';
import { useAppTheme } from '@/providers/theme-provider';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth(); const { palette } = useAppTheme(); const { t } = useI18n(); const queryClient = useQueryClient(); const [content, setContent] = useState('');
  useActiveConversationRealtime(conversationId, user?.id);
  const messages = useQuery({ queryKey: conversationKeys.messages(conversationId), queryFn: () => fetchMessages(conversationId) });
  useEffect(() => {
    if (!user) return;
    void markConversationRead(conversationId, user.id).then(() =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.list(user.id) }),
    );
  }, [conversationId, queryClient, user]);
  const send = useMutation({ mutationFn: (text: string) => sendMessage(conversationId, user!.id, text), onSuccess: (message) => { queryClient.setQueryData<ChatMessage[]>(conversationKeys.messages(conversationId), (current = []) => [message, ...current]); setContent(''); } });

  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header, { borderColor: palette.border, backgroundColor: palette.surface }]}><Pressable accessibilityLabel={t('back')} onPress={() => router.back()} style={styles.headerButton}><ArrowLeft color={palette.text} size={23} /></Pressable><View style={styles.contact}><View style={styles.avatar}><UserRound color="white" size={21} /></View><View><Text style={[styles.contactName, { color: palette.text }]}>CasaSeg</Text><Text style={[styles.presence, { color: colors.success }]}>{t('secureConversation')}</Text></View></View></View>
    <FlatList data={messages.data ?? []} inverted keyExtractor={(item) => item.id} contentContainerStyle={styles.messages} renderItem={({ item }) => { const own = item.senderId === user?.id; return <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble, { backgroundColor: own ? colors.brand : palette.surface }]}><Text style={{ color: own ? 'white' : palette.text, fontSize: 15, lineHeight: 21 }}>{item.content}</Text><Text style={[styles.status, { color: own ? 'rgba(255,255,255,.75)' : palette.muted }]}>{item.status}</Text></View>; }} ListEmptyComponent={<Text style={[styles.empty, { color: palette.textSecondary }]}>{t('firstMessage')}</Text>} />
    <View style={[styles.composer, { backgroundColor: palette.surface, borderColor: palette.border }]}><TextInput accessibilityLabel={t('writeMessage')} value={content} onChangeText={setContent} multiline placeholder={t('writeMessage')} placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.subtle }]} /><Pressable accessibilityLabel={t('sendMessage')} disabled={!content.trim() || send.isPending} onPress={() => send.mutate(content.trim())} style={[styles.send, { opacity: content.trim() ? 1 : .45 }]}><Send color="white" size={21} /></Pressable></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, header: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, contact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, contactName: { fontSize: 15, fontWeight: '800' }, presence: { fontSize: 12, fontWeight: '700', marginTop: 2 }, messages: { padding: 16, gap: 8 }, bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 4 }, ownBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 }, otherBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 }, status: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' }, empty: { textAlign: 'center', padding: 30, fontSize: 14 }, composer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 }, send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' } });
