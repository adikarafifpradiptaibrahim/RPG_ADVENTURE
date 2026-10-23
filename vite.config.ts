import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    host: true, // Agar Vite bisa diakses dari jaringan luar/Tailscale
    allowedHosts: [
      'srvgame.banteng-sargas.ts.net', // Domain Tailscale Anda
      'localhost',
      '127.0.0.1'
    ]
  }
});