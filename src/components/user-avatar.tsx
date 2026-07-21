import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type UserAvatarProps = {
  name: string;
  uri?: string;
  size?: number;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function normalizeAvatarUrl(uri?: string) {
  if (!uri?.trim()) return undefined;
  if (uri.startsWith('//')) return `https:${uri}`;
  return uri.replace(/^http:/, 'https:');
}

export function UserAvatar({ name, uri, size = 52 }: UserAvatarProps) {
  const imageUrl = normalizeAvatarUrl(uri);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Foto de perfil de ${name}`}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: Math.max(14, size * 0.34) }]}>{getInitials(name)}</Text>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          cachePolicy="disk"
          contentFit="cover"
          transition={160}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  initials: {
    color: 'white',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
