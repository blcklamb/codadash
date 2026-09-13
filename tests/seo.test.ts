import { describe, expect, it } from 'vitest';
import {
  metadata,
  renderPage,
  siteOrigin,
  sitemap,
  structuredData,
} from '../apps/web/seo/metadata';

describe('codadash search metadata', () => {
  it('uses page-specific titles and strips invite codes from canonical URLs', () => {
    const home = metadata('/', 'ko', 'https://example.com');
    expect(home.title).toContain('codadash (코다대시)');
    for (const keyword of ['키보드 연습', '타자 연습', '타건 연습'])
      expect(home.description).toContain(keyword);
    const battle = metadata('/battle/?code=ABC123', 'ko', 'https://example.com');
    expect(battle.title).not.toBe(home.title);
    expect(battle.canonical).toBe('https://example.com/battle');
    expect(metadata('/speed', 'ko', 'https://example.com').canonical).toBe(home.canonical);
  });
  it('keeps private and unknown routes out of search and uses matching locale', () => {
    for (const path of ['/records', '/settings', '/auth/callback', '/unknown'])
      expect(metadata(path).robots).toBe('noindex, follow');
    expect(metadata('/daily', 'en').title).toContain('Daily typing practice');
    expect(metadata('/daily', 'en').locale).toBe('en');
    expect(metadata('/').canonical).toBe('');
  });
  it('renders readable initial HTML and replaces metadata without duplicate tags', () => {
    const template =
      '<head><!-- seo:start --><!-- seo:end --></head><div id="root"><!-- intro:start --><!-- intro:end --></div>';
    const home = renderPage(template, '/', 'https://example.com');
    const daily = renderPage(home, '/daily', 'https://example.com');
    expect(daily.match(/<title>/g)).toHaveLength(1);
    expect(daily.match(/name="description"/g)).toHaveLength(1);
    expect(daily).toContain('<a href="/battle">');
    expect(daily).toContain('일일 타자 연습');
    expect(daily).toContain('href="https://example.com/daily"');
    expect(daily).toContain('property="og:site_name" content="codadash"');
    expect(structuredData('Typing').alternateName).toBe('코다대시');
  });
  it('only includes public routes in the sitemap and rejects malformed origins', () => {
    const xml = sitemap('https://example.com/');
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('https://example.com/daily');
    expect(xml).not.toContain('/records');
    for (const value of [
      'javascript:alert(1)',
      'https://example.com/path',
      'https://user:pass@example.com',
    ])
      expect(() => siteOrigin(value)).toThrow();
  });
});
