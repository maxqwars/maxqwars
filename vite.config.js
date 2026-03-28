import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';
import fs from 'fs';

const landingData = JSON.parse(
  fs.readFileSync(resolve(__dirname, 'src/data/config.json'), 'utf-8')
);

export default defineConfig({
  base: '/maxqwars',
  root: 'src',
  publicDir: '../public',
  build: {
    cssTarget: 'chrome80', // Set css target to modern browsers
    // cssMinify: 'lightningcss', CSS minification broke glass effect
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
