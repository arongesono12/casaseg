import { Image } from 'expo-image';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { X } from '@/components/ui/icons';
import { useI18n } from '@/providers/i18n-context';

type GalleryItem = { id: string; uri: string };
type PropertyGalleryProps = { visible: boolean; images: string[]; title: string; initialIndex?: number; onClose: () => void };

const GalleryImage = memo(function GalleryImage({ item, width, title }: { item: GalleryItem; width: number; title: string }) {
  return <Image source={{ uri: item.uri }} cachePolicy="disk" contentFit="contain" style={[styles.image, { width }]} accessibilityLabel={title} />;
});

export function PropertyGallery({ visible, images, title, initialIndex = 0, onClose }: PropertyGalleryProps) {
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const galleryItems = useMemo<GalleryItem[]>(() => Array.from(new Set(images)).map((uri) => ({ id: uri, uri })), [images]);
  const safeInitialIndex = Math.min(Math.max(initialIndex, 0), Math.max(galleryItems.length - 1, 0));
  const [index, setIndex] = useState(safeInitialIndex);
  // Cada vez que la galería se abre (o cambia la foto de partida) el contador
  // vuelve a esa foto. Se ajusta durante el render para no pintar antes el
  // índice anterior, como ocurría con el efecto.
  const openedAt = visible ? safeInitialIndex : null;
  const [lastOpenedAt, setLastOpenedAt] = useState(openedAt);
  if (lastOpenedAt !== openedAt) {
    setLastOpenedAt(openedAt);
    if (openedAt !== null) setIndex(openedAt);
  }
  const renderImage = useCallback<ListRenderItem<GalleryItem>>(
    ({ item }) => <GalleryImage item={item} width={width} title={title} />,
    [title, width],
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<GalleryItem> | null | undefined, itemIndex: number) => ({ length: width, offset: width * itemIndex, index: itemIndex }),
    [width],
  );

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.header}>
          <Text selectable numberOfLines={1} style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('closeGallery')} hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.72 : 1 }]}>
            <X color="white" size={24} />
          </Pressable>
        </View>
        <FlatList
          key={`${visible}-${safeInitialIndex}-${Math.round(width)}`}
          data={galleryItems}
          horizontal
          pagingEnabled
          bounces={false}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={getItemLayout}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.min(Math.round(event.nativeEvent.contentOffset.x / width), Math.max(galleryItems.length - 1, 0)))}
          renderItem={renderImage}
        />
        <Text selectable style={styles.counter}>{galleryItems.length ? index + 1 : 0} / {galleryItems.length}</Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  title: { flex: 1, color: 'white', fontSize: 16, fontWeight: '800' },
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  image: { flex: 1 },
  counter: { color: 'white', textAlign: 'center', padding: 16, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
