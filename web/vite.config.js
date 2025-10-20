import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function getHttpsConfig() {
  // Enable when USE_HTTPS=1 and cert/key exist, or when cert envs are provided
  const useHttps = process.env.USE_HTTPS === '1' || process.env.USE_HTTPS === 'true';
  if (!useHttps) return undefined;

  // Prefer a PFX bundle on Windows for easier certificate management
  const pfxPath = process.env.VITE_DEV_HTTPS_PFX;
  const pfxPass = process.env.VITE_DEV_HTTPS_PASS || '';
  if (pfxPath && fs.existsSync(pfxPath)) {
    try {
      return { pfx: fs.readFileSync(pfxPath), passphrase: pfxPass };
    } catch {}
  }

  // Fallback to PEM cert/key if provided
  const certPath = process.env.VITE_DEV_HTTPS_CERT || path.resolve(__dirname, 'certs/dev-cert.pem');
  const keyPath = process.env.VITE_DEV_HTTPS_KEY || path.resolve(__dirname, 'certs/dev-key.pem');
  try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    }
  } catch {}
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5022,
    // Bind to all interfaces so phones/tablets on the same Wi‑Fi can reach it via your LAN IP
    host: true,
    open: true,
    https: getHttpsConfig(),
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
