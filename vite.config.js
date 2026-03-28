import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';
import fs from 'fs';

const landingData = JSON.parse(
  fs.readFileSync(resolve(__dirname, 'src/data/config.json'), 'utf-8')
);

export default defineConfig({
  base: '/',
  root: 'src',
  publicDir: '../public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
    },
    outDir: '../dist',
  },
  plugins: [
    handlebars({
      context: landingData,
      partialDirectory: resolve(__dirname, 'src/partials'),
    }),
  ],
});
