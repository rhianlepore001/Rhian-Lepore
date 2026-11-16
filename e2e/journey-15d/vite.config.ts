import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  envDir: path.dirname(fileURLToPath(import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': process.cwd() } },
  define: { __APP_BUILD_ID__: JSON.stringify('journey-mock') },
  server: { strictPort: true },
});
