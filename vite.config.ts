import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function formatWorldLayoutConfigTS(config: any): string {
  const landmarksEntries = Object.entries(config.landmarks || {}).map(([key, item]: [string, any]) => {
    return `    ${key}: {
      id: '${item.id}',
      name: '${(item.name || '').replace(/'/g, "\\'")}',
      nameId: '${(item.nameId || '').replace(/'/g, "\\'")}',
      x: ${Number((item.x ?? 0).toFixed(2))},
      y: ${Number((item.y ?? 0).toFixed(2))},
      z: ${Number((item.z ?? 0).toFixed(2))},
      rotationY: ${Number((item.rotationY ?? 0).toFixed(4))},
      scale: ${Number((item.scale ?? 1.0).toFixed(2))},
      flattenRadius: ${Number((item.flattenRadius ?? 30).toFixed(1))},
      category: '${item.category || 'landmark'}',
    },`;
  }).join('\n');

  const bridgesEntries = Object.entries(config.bridges || {}).map(([key, item]: [string, any]) => {
    return `    ${key}: {
      id: '${item.id}',
      name: '${(item.name || '').replace(/'/g, "\\'")}',
      nameId: '${(item.nameId || '').replace(/'/g, "\\'")}',
      x: ${Number((item.x ?? 0).toFixed(2))},
      y: ${Number((item.y ?? 0).toFixed(2))},
      z: ${Number((item.z ?? 0).toFixed(2))},
      rotationY: ${Number((item.rotationY ?? 0).toFixed(4))},
      length: ${Number((item.length ?? 24).toFixed(1))},
      width: ${Number((item.width ?? 4.8).toFixed(1))},
      scale: ${Number((item.scale ?? 1.0).toFixed(2))},
      type: '${item.type || 'stone'}',
    },`;
  }).join('\n');

  return `/**
 * Lead 3D World Architect & Technical Tooling Engineer
 * Centralized Single Source of Truth for World Layout Coordinates, Rotations & Scales.
 * 
 * In Dev Mode (localhost), this file is automatically written by the In-Game Visual World Editor
 * via the Vite Dev Server middleware endpoint (POST /__api/save-world-layout).
 */

export interface WorldLandmarkLayout {
  id: string;
  name: string;
  nameId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number; // in radians
  scale: number;
  flattenRadius: number;
  category: 'village' | 'castle' | 'desert' | 'boss' | 'island' | 'landmark';
}

export interface WorldBridgeLayout {
  id: string;
  name: string;
  nameId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number; // in radians
  length: number;
  width: number;
  scale: number;
  type: 'stone' | 'suspension' | 'wood';
}

export interface WorldLayoutConfig {
  version: number;
  lastUpdated: string;
  landmarks: Record<string, WorldLandmarkLayout>;
  bridges: Record<string, WorldBridgeLayout>;
}

export const WORLD_LAYOUT_CONFIG: WorldLayoutConfig = {
  version: ${config.version || 1},
  lastUpdated: '${new Date().toISOString()}',
  landmarks: {
${landmarksEntries}
  },
  bridges: {
${bridgesEntries}
  },
};

/**
 * Helper to retrieve a landmark's current layout with fallback
 */
export function getLandmarkLayout(id: string): WorldLandmarkLayout | undefined {
  return WORLD_LAYOUT_CONFIG.landmarks[id];
}

/**
 * Helper to retrieve a bridge's current layout with fallback
 */
export function getBridgeLayout(id: string): WorldBridgeLayout | undefined {
  return WORLD_LAYOUT_CONFIG.bridges[id];
}
`;
}

function worldLayoutSaverPlugin(): Plugin {
  return {
    name: 'world-layout-saver',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/__api/save-world-layout') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const cfg = parsed.config || parsed;
              const filePath = path.resolve(__dirname, 'src/game/3d/worldLayoutConfig.ts');
              const tsCode = formatWorldLayoutConfigTS(cfg);
              fs.writeFileSync(filePath, tsCode, 'utf8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Tersimpan ke worldLayoutConfig.ts — Siap git push!' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || String(err) }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), worldLayoutSaverPlugin()],
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