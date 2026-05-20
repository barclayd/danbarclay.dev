// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [
    react(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
        'https://danbarclay.dev/',
        'https://danbarclay.dev/about/',
        'https://danbarclay.dev/work/',
        'https://danbarclay.dev/podcasts/',
        'https://danbarclay.dev/tweets/',
        'https://danbarclay.dev/promptly/',
        'https://danbarclay.dev/keepfresh/',
      ],
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
  },
  output: 'static',
  site: 'https://danbarclay.dev',
});
