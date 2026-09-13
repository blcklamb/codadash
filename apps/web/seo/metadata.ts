export const BRAND = 'codadash';
export const SITE_ORIGIN = 'https://codadash.vercel.app';
export const BRAND_KO = '코다대시';
export const publicPaths = ['/', '/daily', '/battle'] as const;
export const pagePaths = [...publicPaths, '/records', '/settings'] as const;
export type PagePath = (typeof pagePaths)[number];

const pages = {
  '/': {
    ko: [
      '코드 타자 연습 · 키보드 연습',
      '11개 언어의 코드로 키보드 연습, 타자 연습, 타건 연습을 시작하세요. 중급·고급 코드의 타수와 정확도를 측정하고 일일 연습과 1대1 대전에 도전하세요.',
    ],
    en: [
      'Code typing practice',
      'Practice keyboard typing with code in 11 programming languages. Measure speed and accuracy with intermediate and advanced code, daily practice, and one-on-one battles.',
    ],
  },
  '/daily': {
    ko: [
      '일일 타자 연습',
      '매일 새로운 코드로 60초 타자 연습을 해보세요. 코다대시에서 키보드 입력 속도와 정확도를 확인하고 꾸준한 타건 연습 기록을 쌓으세요.',
    ],
    en: [
      'Daily typing practice',
      'Build a daily keyboard practice habit with a fresh 60-second code challenge. Track your typing speed, accuracy, and completed days with codadash.',
    ],
  },
  '/battle': {
    ko: [
      '1대1 코드 타자 대전',
      '친구와 함께하는 실시간 코드 타자 연습. 초대 코드로 연결해 떨어지는 코드를 입력하고 키보드 타건 속도와 정확도를 겨뤄보세요.',
    ],
    en: [
      'One-on-one typing battles',
      'Practice code typing with a friend in a real-time keyboard battle. Join with an invite code, clear falling code, and compete on speed and accuracy.',
    ],
  },
  '/records': {
    ko: [
      '내 타자 연습 기록',
      '코다대시에서 타자 연습의 타수, 정확도, 개인 최고 기록과 일일 연습 내역을 확인하세요.',
    ],
    en: [
      'Your typing records',
      'Review your typing speed, accuracy, personal bests, and daily practice history on codadash.',
    ],
  },
  '/settings': {
    ko: ['설정', '코다대시의 언어, 입력 사운드, 화면 효과와 계정 설정을 변경하세요.'],
    en: [
      'Settings',
      'Adjust language, typing sounds, visual effects, and account settings on codadash.',
    ],
  },
} as const;

export function siteOrigin(value = '') {
  if (!value.trim()) return '';
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'VITE_SITE_URL must be an HTTP(S) origin without a path, credentials, query, or fragment.',
    );
  return url.origin;
}

export function metadata(pathname: string, language = 'ko', origin = '') {
  const cleanPath = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const path = cleanPath === '/speed' ? '/' : cleanPath;
  const known = Object.hasOwn(pages, path);
  const page = pages[known ? (path as PagePath) : '/'];
  const locale = language.startsWith('ko') ? 'ko' : 'en';
  const [heading, description] = page[locale];
  return {
    title: `${locale === 'ko' ? 'codadash (코다대시)' : BRAND} | ${heading}`,
    description,
    locale,
    canonical: origin && known ? `${siteOrigin(origin)}${path}` : '',
    robots:
      known && (publicPaths as readonly string[]).includes(path)
        ? 'index, follow'
        : 'noindex, follow',
  };
}

export function structuredData(description: string, origin = '') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND,
    alternateName: BRAND_KO,
    description,
    inLanguage: ['ko', 'en'],
    ...(origin ? { url: siteOrigin(origin) + '/' } : {}),
  };
}

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

export function renderSeo(path: string, origin = '') {
  const data = metadata(path, 'ko', origin);
  const meta = (name: string, content: string, attribute = 'name') =>
    `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`;
  const head = [
    `<title>${escapeHtml(data.title)}</title>`,
    meta('description', data.description),
    meta('robots', data.robots),
    meta('application-name', BRAND),
    meta('og:type', 'website', 'property'),
    meta('og:site_name', BRAND, 'property'),
    meta('og:title', data.title, 'property'),
    meta('og:description', data.description, 'property'),
    meta('og:locale', 'ko_KR', 'property'),
    meta('twitter:card', 'summary'),
    meta('twitter:title', data.title),
    meta('twitter:description', data.description),
    ...(data.canonical
      ? [
          `<link rel="canonical" href="${escapeHtml(data.canonical)}" />`,
          meta('og:url', data.canonical, 'property'),
        ]
      : []),
    `<script id="site-schema" type="application/ld+json">${JSON.stringify(structuredData(data.description, origin)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
  const body = `<main><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.description)}</p><nav aria-label="서비스 메뉴"><a href="/">코드 타자 연습</a> · <a href="/daily">일일 타자 연습</a> · <a href="/battle">1대1 타자 대전</a></nav><noscript><p>연습을 시작하려면 브라우저에서 자바스크립트를 켜주세요.</p></noscript></main>`;
  return { head, body };
}

export function renderPage(html: string, path: string, origin = '') {
  const { head, body } = renderSeo(path, origin);
  return html
    .replace(
      /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/,
      `<!-- seo:start -->\n${head}\n<!-- seo:end -->`,
    )
    .replace(
      /<!-- intro:start -->[\s\S]*?<!-- intro:end -->/,
      `<!-- intro:start -->${body}<!-- intro:end -->`,
    );
}

export function sitemap(origin: string) {
  const base = siteOrigin(origin);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map((path) => `<url><loc>${escapeHtml(base + path)}</loc></url>`).join('')}</urlset>\n`;
}
