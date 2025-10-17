import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5022,
    // Bind to all interfaces so phones/tablets on the same Wi‑Fi can reach it via your LAN IP
    host: true,
    open: true,
    proxy: {
      // Proxy REST API to the backend to avoid CORS in dev and support dynamic LAN IPs
      '/api': {
        // If backend listens on all interfaces, localhost is fine for same machine.
        // Devices on LAN will hit Vite, which proxies to this target from the dev box.
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO WebSocket endpoint
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
        // Optional timeouts to reduce ECONNRESET noise on slow networks
        timeout: 30000,
        proxyTimeout: 30000,
      }
    }
  }
});
