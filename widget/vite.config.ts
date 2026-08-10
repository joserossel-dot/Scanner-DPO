import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PrivacyTech',
      fileName: () => 'widget.js',
      formats: ['iife']
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild'
  }
});
