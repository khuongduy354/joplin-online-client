import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "joplin-sync": path.resolve(__dirname, "../joplin-sync-lib/dist"),
      // Node.js built-in polyfills
      crypto: path.resolve(__dirname, "node_modules/crypto-browserify"),
      stream: path.resolve(__dirname, "node_modules/stream-browserify"),
      buffer: path.resolve(__dirname, "node_modules/buffer"),
      zlib: path.resolve(__dirname, "node_modules/browserify-zlib"),
      util: path.resolve(__dirname, "node_modules/util"),
      path: path.resolve(__dirname, "node_modules/path-browserify"),
      os: path.resolve(__dirname, "node_modules/os-browserify/browser"),
      events: path.resolve(__dirname, "node_modules/events"),
      querystring: path.resolve(__dirname, "node_modules/querystring-es3"),
      assert: path.resolve(__dirname, "node_modules/assert"),
      url: path.resolve(__dirname, "node_modules/url"),
      process: path.resolve(__dirname, "node_modules/process/browser"),
      // Stub out Node.js-specific modules that have no browser equivalent
      "fs-extra": path.resolve(__dirname, "src/stubs/fs-stub.ts"),
      "md5-file": path.resolve(__dirname, "src/stubs/md5-file-stub.ts"),
      "graceful-fs": path.resolve(__dirname, "src/stubs/fs-stub.ts"),
      fs: path.resolve(__dirname, "src/stubs/fs-stub.ts"),
      http: path.resolve(__dirname, "src/stubs/http-stub.ts"),
      https: path.resolve(__dirname, "src/stubs/http-stub.ts"),
    },
  },
  define: {
    "process.env": {},
    "process.version": JSON.stringify("v16.0.0"),
    "process.versions": JSON.stringify({ node: "16.0.0" }),
    "process.platform": JSON.stringify("browser"),
    "process.browser": true,
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["joplin-sync", "buffer", "process"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
