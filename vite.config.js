import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.jsx'),
      },
      output: {
        entryFileNames: 'index.js',
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
