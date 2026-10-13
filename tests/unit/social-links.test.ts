import { describe, expect, test } from 'bun:test';

import {
  buildSocialUrl,
  getVisibleSocialLinks,
  socialFormFromLinks,
  socialHandleFromUrl,
  socialLinksFromForm,
} from '../../src/features/profile/social-links';

describe('redes sociales del perfil', () => {
  test('completa la URL del perfil a partir del usuario', () => {
    expect(buildSocialUrl('instagram', 'casaseg')).toEqual({ ok: true, value: 'https://www.instagram.com/casaseg' });
    expect(buildSocialUrl('twitter', '@casaseg_gq')).toEqual({ ok: true, value: 'https://x.com/casaseg_gq' });
    expect(buildSocialUrl('linkedin', 'ana-perez-123')).toEqual({ ok: true, value: 'https://www.linkedin.com/in/ana-perez-123' });
    expect(buildSocialUrl('facebook', 'casaseg.oficial')).toEqual({ ok: true, value: 'https://www.facebook.com/casaseg.oficial' });
    expect(buildSocialUrl('youtube', '@CasasEG')).toEqual({ ok: true, value: 'https://www.youtube.com/@CasasEG' });
  });

  test('acepta una URL pegada de la misma red y la fuerza a https', () => {
    expect(buildSocialUrl('instagram', 'instagram.com/casaseg/')).toEqual({ ok: true, value: 'https://instagram.com/casaseg' });
    expect(buildSocialUrl('linkedin', 'http://www.linkedin.com/company/casaseg')).toEqual({ ok: true, value: 'https://www.linkedin.com/company/casaseg' });
  });

  test('rechaza otros dominios, esquemas peligrosos y usuarios inválidos', () => {
    expect(buildSocialUrl('instagram', 'https://evil.example/casaseg')).toEqual({ ok: false });
    expect(buildSocialUrl('instagram', 'javascript:alert(1)')).toEqual({ ok: false });
    expect(buildSocialUrl('twitter', 'nombre con espacios')).toEqual({ ok: false });
    expect(buildSocialUrl('website', 'ftp://casaseg.com')).toEqual({ ok: false });
  });

  test('vacío borra el enlace y la web recibe https', () => {
    expect(buildSocialUrl('facebook', '  ')).toEqual({ ok: true, value: '' });
    expect(buildSocialUrl('website', 'casaseg.com')).toEqual({ ok: true, value: 'https://casaseg.com/' });
  });

  test('al editar muestra solo el usuario de los enlaces guardados', () => {
    expect(socialHandleFromUrl('instagram', 'https://www.instagram.com/casaseg')).toBe('casaseg');
    expect(socialHandleFromUrl('twitter', 'https://twitter.com/casaseg')).toBe('casaseg');
    expect(socialHandleFromUrl('youtube', 'https://www.youtube.com/@CasasEG')).toBe('CasasEG');
    expect(socialHandleFromUrl('linkedin', 'https://www.linkedin.com/company/casaseg')).toBe('https://www.linkedin.com/company/casaseg');
  });

  test('el formulario ida y vuelta conserva las URLs y señala las redes inválidas', () => {
    const form = socialFormFromLinks({ instagram: 'https://www.instagram.com/casaseg', website: 'https://casaseg.com/' });
    expect(form.instagram).toBe('casaseg');
    expect(socialLinksFromForm(form).links.instagram).toBe('https://www.instagram.com/casaseg');
    expect(socialLinksFromForm({ ...form, twitter: 'mal usuario' }).invalid).toEqual(['twitter']);
  });

  test('los enlaces generados se pueden abrir desde la portada', () => {
    const { links } = socialLinksFromForm({ ...socialFormFromLinks(null), instagram: 'casaseg', twitter: 'casaseg_gq' });
    expect(getVisibleSocialLinks(links).map(({ key, url }) => [key, url])).toEqual([
      ['instagram', 'https://www.instagram.com/casaseg'],
      ['twitter', 'https://x.com/casaseg_gq'],
    ]);
  });
});
