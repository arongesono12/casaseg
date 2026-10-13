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

// ---------------------------------------------------------------------------
// Edición: el usuario escribe solo su nombre de usuario y al guardar se
// completa la URL del perfil (misma lógica que la web, src/utils/socialLinks.ts).
// ---------------------------------------------------------------------------

type ProfileNetworkKey = Exclude<SocialNetworkKey, 'website'>;

const profileRules: Readonly<Record<ProfileNetworkKey, { profileBase: string; handle: RegExp; profilePath: RegExp }>> = {
  instagram: { profileBase: 'https://www.instagram.com/', handle: /^[A-Za-z0-9._]{1,30}$/, profilePath: /^\/([A-Za-z0-9._]{1,30})\/?$/ },
  twitter: { profileBase: 'https://x.com/', handle: /^[A-Za-z0-9_]{1,15}$/, profilePath: /^\/([A-Za-z0-9_]{1,15})\/?$/ },
  linkedin: { profileBase: 'https://www.linkedin.com/in/', handle: /^[A-Za-z0-9_-]{3,100}$/, profilePath: /^\/in\/([A-Za-z0-9_-]{3,100})\/?$/ },
  facebook: { profileBase: 'https://www.facebook.com/', handle: /^[A-Za-z0-9.]{3,50}$/, profilePath: /^\/([A-Za-z0-9.]{3,50})\/?$/ },
  youtube: { profileBase: 'https://www.youtube.com/@', handle: /^[A-Za-z0-9._-]{3,30}$/, profilePath: /^\/@([A-Za-z0-9._-]{3,30})\/?$/ },
};

/** Texto de ayuda que se muestra junto al campo de usuario. */
export const socialUrlPrefix: Readonly<Record<ProfileNetworkKey, string>> = {
  instagram: 'instagram.com/',
  twitter: 'x.com/',
  linkedin: 'linkedin.com/in/',
  facebook: 'facebook.com/',
  youtube: 'youtube.com/@',
};

export type SocialUrlResult = { ok: true; value: string } | { ok: false };
export type SocialLinksForm = Record<SocialNetworkKey, string>;
export type SocialLinks = Partial<Record<SocialNetworkKey, string>>;

const hostsFor = (key: SocialNetworkKey): readonly string[] =>
  socialNetworks.find((network) => network.key === key)?.hosts ?? [];

function parseWebUrl(input: string): URL | null {
  if (/\s/.test(input)) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input);
  if (hasScheme && !/^https?:\/\//i.test(input)) return null;
  try {
    const url = new URL(hasScheme ? input : `https://${input}`);
    if (!url.hostname.includes('.') || url.username || url.password) return null;
    url.protocol = 'https:';
    return url;
  } catch {
    return null;
  }
}

const matchesHost = (url: URL, hosts: readonly string[]) =>
  hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));

export function buildSocialUrl(key: SocialNetworkKey, input: string): SocialUrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: '' };

  if (key === 'website') {
    const url = parseWebUrl(trimmed);
    return url ? { ok: true, value: url.toString() } : { ok: false };
  }

  const hosts = hostsFor(key);
  if (/[/:]/.test(trimmed) || hosts.some((host) => trimmed.toLowerCase().includes(host))) {
    const url = parseWebUrl(trimmed);
    if (!url || !matchesHost(url, hosts)) return { ok: false };
    return { ok: true, value: `https://${url.hostname}${url.pathname.replace(/\/+$/, '')}${url.search}` };
  }

  const handle = trimmed.replace(/^@/, '');
  const rule = profileRules[key];
  return rule.handle.test(handle) ? { ok: true, value: `${rule.profileBase}${handle}` } : { ok: false };
}

/** Valor que se muestra al editar: solo el usuario si el enlace es un perfil simple. */
export function socialHandleFromUrl(key: SocialNetworkKey, stored: unknown): string {
  if (typeof stored !== 'string' || !stored) return '';
  if (key === 'website') return stored;
  const url = parseWebUrl(stored.trim());
  if (!url || url.search || !matchesHost(url, hostsFor(key))) return stored;
  return profileRules[key].profilePath.exec(url.pathname)?.[1] ?? stored;
}

export function socialFormFromLinks(links?: Record<string, unknown> | null): SocialLinksForm {
  return Object.fromEntries(socialNetworks.map(({ key }) => [key, socialHandleFromUrl(key, links?.[key])])) as SocialLinksForm;
}

/** Convierte lo escrito en URLs completas; devuelve también las redes inválidas. */
export function socialLinksFromForm(form: SocialLinksForm): { links: SocialLinks; invalid: SocialNetworkKey[] } {
  const links: SocialLinks = {};
  const invalid: SocialNetworkKey[] = [];
  for (const { key } of socialNetworks) {
    const result = buildSocialUrl(key, form[key]);
    if (result.ok) links[key] = result.value;
    else invalid.push(key);
  }
  return { links, invalid };
}
