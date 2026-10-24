import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [cspPlugin()],
  resolve: {
    alias:
      mode === 'altdata'
        ? [
            {
              find: /^\.\/data\/questions\.json$/,
              replacement: fileURLToPath(new URL('./tests/e2e/fixtures/valid-alt.json', import.meta.url)),
            },
          ]
        : [],
  },
}));
