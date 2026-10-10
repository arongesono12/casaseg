export const socialNetworks = [
  { key: 'instagram', label: 'Instagram', hosts: ['instagram.com'] },
  { key: 'twitter', label: 'X', hosts: ['x.com', 'twitter.com'] },
  { key: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
  { key: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  { key: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { key: 'website', label: 'Sitio web', hosts: [] },
] as const;

export type SocialNetworkKey = (typeof socialNetworks)[number]['key'];
export type VisibleSocialLink = { key: SocialNetworkKey; label: string; url: string };

/** User supplied links are never opened unless they resolve to a web URL. */
export function getVisibleSocialLinks(links?: Record<string, unknown> | null): VisibleSocialLink[] {
  if (!links || typeof links !== 'object') return [];
  return socialNetworks.flatMap(({ key, label, hosts }) => {
    const raw = links[key];
    if (typeof raw !== 'string' || !raw.trim()) return [];
    const trimmed = raw.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return [];
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
      return [];
    }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return [];
    if (url.port && url.port !== '443') return [];
    if (hosts.length && !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return [];
    url.protocol = 'https:';
    return [{ key, label, url: url.toString() }];
  });
}
