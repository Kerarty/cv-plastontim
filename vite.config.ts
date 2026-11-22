import { defineConfig } from 'vite';

const REPO = 'cv-plastontim';

export default defineConfig({
  base: `/${REPO}/`,
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
