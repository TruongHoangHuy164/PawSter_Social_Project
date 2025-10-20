import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

function getHttpsConfig(env) {
  // Enable when USE_HTTPS=1 and cert/key exist, or when cert envs are provided
  const useHttps = env.USE_HTTPS === "1" || env.USE_HTTPS === "true";
  if (!useHttps) return undefined;

  // Prefer a PFX bundle on Windows for easier certificate management
  const pfxPath = env.VITE_DEV_HTTPS_PFX;
  const pfxPass = env.VITE_DEV_HTTPS_PASS || "";
  if (pfxPath && fs.existsSync(pfxPath)) {
    try {
      return { pfx: fs.readFileSync(pfxPath), passphrase: pfxPass };
    } catch {}
  }

  // Fallback to PEM cert/key if provided
  const certPath =
    env.VITE_DEV_HTTPS_CERT || path.resolve(__dirname, "certs/dev-cert.pem");
  const keyPath =
    env.VITE_DEV_HTTPS_KEY || path.resolve(__dirname, "certs/dev-key.pem");
  try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    }
  } catch {}
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5022,
      // Bind to all interfaces so phones/tablets on the same Wi‑Fi can reach it via your LAN IP
      host: true,
      open: true,
      https: getHttpsConfig(env),
      proxy: {
        // Proxy REST API to the backend to avoid CORS in dev and support dynamic LAN IPs
        "/api": {
          // If backend listens on all interfaces, localhost is fine for same machine.
          // Devices on LAN will hit Vite, which proxies to this target from the dev box.
          target: "http://127.0.0.1:3000",
          changeOrigin: true,
          secure: false,
        },
        // Proxy Socket.IO WebSocket endpoint
        "/socket.io": {
          target: "http://127.0.0.1:3000",
          ws: true,
          changeOrigin: true,
          secure: false,
          // Optional timeouts to reduce ECONNRESET noise on slow networks
          timeout: 30000,
          proxyTimeout: 30000,
          // Handle WebSocket errors gracefully
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log("[Vite] WebSocket proxy error:", err.message);
              // Only try to send error response if res exists and has the method
              if (
                res &&
                typeof res.writeHead === "function" &&
                !res.headersSent
              ) {
                try {
                  res.writeHead(500, {
                    "Content-Type": "text/plain",
                  });
                  res.end("WebSocket proxy error");
                } catch (e) {
                  // Ignore if response is already closed
                }
              }
            });
            proxy.on("proxyReqWs", (proxyReq, req, socket) => {
              socket.on("error", (err) => {
                console.log("[Vite] WebSocket socket error:", err.message);
              });
            });
          },
        },
      },
    },
  };
});
