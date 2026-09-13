import type { Plugin } from 'vite';
import { pagePaths, renderPage, siteOrigin, sitemap } from './metadata';

export function seoPlugin(url: string): Plugin {
  const origin = siteOrigin(url);
  return {
    name: 'codadash-seo',
    enforce: 'post',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        return renderPage(html, context.originalUrl || '/', origin);
      },
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      for (const path of pagePaths.filter((path) => path !== '/')) {
        this.emitFile({
          type: 'asset',
          fileName: `${path.slice(1)}/index.html`,
          source: renderPage(String(index.source), path, origin),
        });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /v1/\nDisallow: /socket.io/\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
      });
      if (origin)
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(origin) });
    },
  };
}
