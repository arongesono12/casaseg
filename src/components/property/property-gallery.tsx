import { Image } from 'expo-image';
import { X } from '@/components/ui/icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PropertyGalleryProps = { visible: boolean; images: string[]; title: string; initialIndex?: number; onClose: () => void };
export function PropertyGallery({ visible, images, title, initialIndex = 0, onClose }: PropertyGalleryProps) {
  const { width } = useWindowDimensions(); const [index, setIndex] = useState(initialIndex);
  return <Modal visible={visible} animationType="fade" onRequestClose={onClose}><SafeAreaView style={styles.safe}><View style={styles.header}><Text numberOfLines={1} style={styles.title}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar galería" onPress={onClose} style={styles.close}><X color="white" size={24} /></Pressable></View><FlatList data={images} horizontal pagingEnabled initialScrollIndex={initialIndex} getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })} keyExtractor={(item, itemIndex) => `${item}-${itemIndex}`} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))} renderItem={({ item }) => <Image source={{ uri: item }} cachePolicy="disk" contentFit="contain" style={{ width, flex: 1 }} />} /><Text style={styles.counter}>{index + 1} / {images.length}</Text></SafeAreaView></Modal>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#050505' }, header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }, title: { flex: 1, color: 'white', fontSize: 16, fontWeight: '800' }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, counter: { color: 'white', textAlign: 'center', padding: 16, fontSize: 14, fontWeight: '800' } });
