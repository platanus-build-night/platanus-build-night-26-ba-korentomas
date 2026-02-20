import { defineConfig } from 'vite';
import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        forge: resolve(__dirname, 'forge.html'),
        favicon: resolve(__dirname, 'favicon.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
