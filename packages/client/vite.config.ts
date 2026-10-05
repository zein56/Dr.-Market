import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // telefondan aynı wifi üzerinden açabilmek için
  },
  preview: { port: 4173, host: true },
});
