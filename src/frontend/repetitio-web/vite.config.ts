/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
const packageVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;
const buildId = process.env.VITE_BUILD_ID || new Date().toISOString();

/**
 * Defines the Vite configuration for the Repetitio frontend.
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: "repetitio-build-version",
      apply: "build",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "app-version.json", source: JSON.stringify({ buildId }) });
      }
    }
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || packageVersion),
    __BUILD_ID__: JSON.stringify(buildId)
  },
  server: {
    port: 3000,
    strictPort: true
  },
  preview: {
    port: 3000,
    strictPort: true
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
