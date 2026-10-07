import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const buildTime = Date.now();
const packageVersion = pkg.version || '2.0.2';

// Plugin to auto-generate public/version.json on build / dev start
function versionGeneratorPlugin() {
  return {
    name: 'version-generator',
    buildStart() {
      const versionData = {
        version: packageVersion,
        buildTime: buildTime,
        builtAt: new Date(buildTime).toISOString()
      };
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        path.resolve(publicDir, 'version.json'),
        JSON.stringify(versionData, null, 2)
      );
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionGeneratorPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __APP_VERSION__: JSON.stringify(packageVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500, // Increase warning limit to 1.5MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@excalidraw')) {
              return 'vendor-excalidraw';
            }
            if (id.includes('tsparticles') || id.includes('matter-js')) {
              return 'vendor-physics-canvas';
            }
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('qr-code-styling') || id.includes('qrcode.react') || id.includes('html5-qrcode')) {
              return 'vendor-qr';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-map';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
