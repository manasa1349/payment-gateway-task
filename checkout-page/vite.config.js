import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-sdk',
      async writeBundle() {
        // Build SDK separately
        try {
          console.log('Building embeddable SDK...');
          // Copy SDK file to dist
          const sdkFile = fs.readFileSync('./src/sdk/PaymentGateway.js', 'utf-8');
          const distFile = path.join(__dirname, 'dist', 'checkout.js');
          
          // Wrap SDK in UMD format
          const umdWrapper = `(function(global){
            ${sdkFile}
            global.PaymentGateway = PaymentGateway;
          })(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);`;
          
          fs.writeFileSync(distFile, umdWrapper);
          console.log('✅ SDK built to', distFile);
        } catch (err) {
          console.error('Failed to build SDK:', err);
        }
      }
    }
  ],
  build: {
    outDir: "dist"
  },
  server: {
    middlewareMode: false,
    port: 5173
  }
});