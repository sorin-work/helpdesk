import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiTarget = process.env.API_URL ?? 'http://localhost:4410';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5190),
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
    },
  },
});
