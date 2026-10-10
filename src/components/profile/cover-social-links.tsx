import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { SocialFacebook, SocialInstagram, SocialLinkedin, SocialWebsite, SocialX, SocialYoutube, type AppIcon } from '@/components/ui/icons';
import { getVisibleSocialLinks, type SocialNetworkKey } from '@/features/profile/social-links';
import { defineCopy, useCopy } from '@/providers/i18n-context';

const copy = defineCopy({
  es: { open: 'Abrir', failed: 'No se pudo abrir el enlace.' },
  fr: { open: 'Ouvrir', failed: 'Impossible d’ouvrir le lien.' },
  en: { open: 'Open', failed: 'Could not open the link.' },
});

const icons: Record<SocialNetworkKey, AppIcon> = {
  instagram: SocialInstagram,
  twitter: SocialX,
  linkedin: SocialLinkedin,
  facebook: SocialFacebook,
  youtube: SocialYoutube,
  website: SocialWebsite,
};

/** Floats over either the signed-in user's cover or a visible public profile. */
export function CoverSocialLinks({ links }: { links?: Record<string, unknown> | null }) {
  const text = useCopy(copy);
  const visibleLinks = getVisibleSocialLinks(links);
  if (!visibleLinks.length) return null;

  return (
    <View style={styles.links}>
      {visibleLinks.map(({ key, label, url }) => {
        const Icon = icons[key];
        return (
          <Pressable
            key={key}
            accessibilityRole="link"
            accessibilityLabel={`${text.open} ${label}`}
            hitSlop={3}
            onPress={() => {
              void Linking.openURL(url).catch(() => {
                if (Platform.OS !== 'web') Alert.alert(text.failed);
              });
            }}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Icon color="white" size={18} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, maxWidth: '80%' },
  link: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  pressed: { opacity: 0.72 },
});
