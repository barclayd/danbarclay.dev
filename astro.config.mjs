// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    react(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      // /macros is a private, noindex utility page - keep it out of the sitemap.
      filter: (page) => !page.includes('/macros'),
    }),
    robotsTxt({
      host: 'danbarclay.dev',
      sitemap: true,
      policy: [
        { userAgent: '*', allow: '/' },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'OAI-SearchBot', allow: '/' },
        { userAgent: 'ChatGPT-User', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
        { userAgent: 'Claude-Web', allow: '/' },
        { userAgent: 'PerplexityBot', allow: '/' },
        { userAgent: 'Perplexity-User', allow: '/' },
        { userAgent: 'Google-Extended', allow: '/' },
        { userAgent: 'CCBot', allow: '/' },
        { userAgent: 'Bytespider', allow: '/' },
        { userAgent: 'Applebot-Extended', allow: '/' },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Lightning CSS folds `animation-timeline: view()` into the `animation`
      // shorthand, where `view()` is not a legal component - Chrome then drops
      // the whole declaration and every scroll-driven animation dies silently.
      // esbuild does not do that merge.
      cssMinify: 'esbuild',
    },
  },
  output: 'static',
  site: 'https://danbarclay.dev',
});
