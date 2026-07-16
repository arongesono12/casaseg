import { Image } from 'expo-image';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from '@/components/ui/icons';

type GalleryItem = { id: string; uri: string };
type PropertyGalleryProps = { visible: boolean; images: string[]; title: string; initialIndex?: number; onClose: () => void };

const GalleryImage = memo(function GalleryImage({ item, width }: { item: GalleryItem; width: number }) {
  return <Image source={{ uri: item.uri }} cachePolicy="disk" contentFit="contain" style={[styles.image, { width }]} />;
});

export function PropertyGallery({ visible, images, title, initialIndex = 0, onClose }: PropertyGalleryProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const galleryItems = useMemo<GalleryItem[]>(() => Array.from(new Set(images)).map((uri) => ({ id: uri, uri })), [images]);
  const renderImage = useCallback<ListRenderItem<GalleryItem>>(({ item }) => <GalleryImage item={item} width={width} />, [width]);
  const getItemLayout = useCallback((_: ArrayLike<GalleryItem> | null | undefined, itemIndex: number) => ({ length: width, offset: width * itemIndex, index: itemIndex }), [width]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text numberOfLines={1} style={styles.title}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar galería" onPress={onClose} style={styles.close}><X color="white" size={24} /></Pressable></View>
        <FlatList data={galleryItems} horizontal pagingEnabled initialScrollIndex={initialIndex} getItemLayout={getItemLayout} keyExtractor={(item) => item.id} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))} renderItem={renderImage} />
        <Text style={styles.counter}>{index + 1} / {galleryItems.length}</Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#050505' }, header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }, title: { flex: 1, color: 'white', fontSize: 16, fontWeight: '800' }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, image: { flex: 1 }, counter: { color: 'white', textAlign: 'center', padding: 16, fontSize: 14, fontWeight: '800' } });
