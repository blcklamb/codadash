import { metadata, structuredData, SITE_ORIGIN } from '../seo/metadata';

export function updateSeo(pathname: string, language: string) {
  const origin = import.meta.env.VITE_SITE_URL || SITE_ORIGIN;
  const data = metadata(pathname, language, origin);
  document.title = data.title;
  document.documentElement.lang = data.locale;
  function meta(name: string, value: string, attribute = 'name') {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.append(element);
    }
    element.content = value;
  }
  meta('description', data.description);
  meta('robots', data.robots);
  meta('og:title', data.title, 'property');
  meta('og:description', data.description, 'property');
  meta('og:locale', data.locale === 'ko' ? 'ko_KR' : 'en_US', 'property');
  meta('twitter:title', data.title);
  meta('twitter:description', data.description);
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.head.querySelector('meta[property="og:url"]')?.remove();
  if (data.canonical) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = data.canonical;
    document.head.append(link);
    meta('og:url', data.canonical, 'property');
  }
  const schema = document.getElementById('site-schema');
  if (schema) schema.textContent = JSON.stringify(structuredData(data.description, origin));
}
