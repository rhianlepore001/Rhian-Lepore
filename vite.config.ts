import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Identificador único de cada build. Vai para o código (`__APP_BUILD_ID__`) e para
 * /version.json — o app compara os dois para saber que saiu uma versão nova.
 * `APP_BUILD_ID` permite fixar o valor (testes).
 */
function createBuildId(): string {
  if (process.env.APP_BUILD_ID) return process.env.APP_BUILD_ID;
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 8);
  return `${commit}-${Date.now().toString(36)}`;
}

function versionFilePlugin(buildId: string): Plugin {
  return {
    name: 'agendix-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildId, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildId = createBuildId();
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      versionFilePlugin(buildId),
      VitePWA({
        // 'prompt': o worker novo fica em espera até o usuário tocar em "Atualizar"
        // (components/UpdatePrompt → SKIP_WAITING). O registro é feito em lib/appUpdate.ts.
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icons/favicon-32x32.png', 'icons/apple-touch-icon.png'],
        workbox: {
          clientsClaim: true,
          skipWaiting: false,
          cleanupOutdatedCaches: true,
          // Ponte de transição/segurança (public/sw-bridge.js): ver comentário no arquivo.
          importScripts: ['/sw-bridge.js'],
          globIgnores: ['sw-bridge.js'],
          // Só o shell (JS/CSS/HTML) + ícones leves; os PNGs grandes antigos em /public ficam fora do precache.
          globPatterns: ['**/*.{js,css,html}', 'icons/*.png', 'img/logo-*.webp'],
        },
        manifest: {
          name: 'Beauty OS',
          short_name: 'BeautyOS',
          description: 'Sistema de Agendamento e Gestão para Salões de Beleza e Barbearias',
          theme_color: '#1F1B2E',
          icons: [
            {
              src: 'icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
