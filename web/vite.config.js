import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5022,
    // Bind to all interfaces so phones/tablets on the same Wi‑Fi can reach it via your LAN IP
    host: true,
    open: true
  }
});
