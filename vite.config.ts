import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'images', dest: '' },
        { src: 'sounds', dest: '' }
      ]
    })
  ],
  base: './', // Ensures assets are loaded correctly on GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});