import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point to source files for dev mode (tsx/esbuild will compile on the fly)
      // For production build, this will also work as Vite bundles everything
      "joplin-sync": path.resolve(__dirname, "../joplin-sync-lib/src"),
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
    // Exclude locally linked packages from pre-bundling
    exclude: ['joplin-sync'],
    include: ['buffer', 'process'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    // Force Vite to always check for changes in excluded dependencies
    force: true,
  },
  // Clear cache on server start
  cacheDir: 'node_modules/.vite',
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    cors: true,
    headers: {
      'Cache-Control': 'no-store',
    },
    // Watch the linked joplin-sync-lib for changes
    watch: {
      ignored: ['!**/node_modules/joplin-sync/**'],
    },
    // Enable fs.allow to access files outside root
    fs: {
      allow: ['..'],
    },
    proxy: {
      // Support multiple localhost ports for WebDAV
      "/webdav-proxy-6065": {
        target: "http://localhost:6065",
        changeOrigin: true,
        secure: false,
        ws: true,
        selfHandleResponse: true,
        rewrite: (path) => path.replace(/^\/webdav-proxy-6065/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // Forward all headers including auth
            if (req.headers.authorization) {
              proxyReq.setHeader("Authorization", req.headers.authorization);
            }
            // Ensure WebDAV methods are preserved
            proxyReq.method = req.method || "GET";
          });

          proxy.on("proxyRes", (proxyRes, req, res) => {
            // Rewrite WebDAV XML responses to include proxy prefix
            const contentType = proxyRes.headers["content-type"] || "";
            if (
              contentType.includes("xml") ||
              contentType.includes("application/xml")
            ) {
              let body = [];
              proxyRes.on("data", (chunk) => {
                body.push(chunk);
              });
              proxyRes.on("end", () => {
                const bodyString = Buffer.concat(body).toString();
                // Rewrite hrefs to include the proxy prefix
                const rewrittenBody = bodyString
                  .replace(/href>\/([^<]*)</g, "href>/webdav-proxy-6065/$1<")
                  .replace(/href>"\/([^"]*)</g, 'href>"/webdav-proxy-6065/$1<');

                // Remove original content-length and set correct one for rewritten body
                const headers = { ...proxyRes.headers };
                delete headers["content-length"];
                headers["content-length"] =
                  Buffer.byteLength(rewrittenBody).toString();

                res.writeHead(proxyRes.statusCode || 200, headers);
                res.end(rewrittenBody);
              });
            } else {
              // For non-XML responses, just pipe through with original headers
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          });

          proxy.on("error", (err, req, res) => {
            console.error("Proxy error:", err);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "text/plain" });
            }
            res.end("Proxy error");
          });
        },
      },
      "/webdav-proxy-8080": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
        selfHandleResponse: true,
        rewrite: (path) => path.replace(/^\/webdav-proxy-8080/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.authorization) {
              proxyReq.setHeader("Authorization", req.headers.authorization);
            }
            proxyReq.method = req.method || "GET";
          });

          proxy.on("proxyRes", (proxyRes, req, res) => {
            const contentType = proxyRes.headers["content-type"] || "";
            if (contentType.includes("xml")) {
              let body = [];
              proxyRes.on("data", (chunk) => body.push(chunk));
              proxyRes.on("end", () => {
                const bodyString = Buffer.concat(body).toString();
                const rewrittenBody = bodyString
                  .replace(/href>\/([^<]*)</g, "href>/webdav-proxy-8080/$1<")
                  .replace(
                    /href>"?\/([^"]*)</g,
                    'href>"/webdav-proxy-8080/$1<',
                  );

                const headers = { ...proxyRes.headers };
                delete headers["content-length"];
                headers["content-length"] =
                  Buffer.byteLength(rewrittenBody).toString();

                res.writeHead(proxyRes.statusCode || 200, headers);
                res.end(rewrittenBody);
              });
            } else {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          });
        },
      },
      "/webdav-proxy-80": {
        target: "http://localhost:80",
        changeOrigin: true,
        secure: false,
        ws: true,
        selfHandleResponse: true,
        rewrite: (path) => path.replace(/^\/webdav-proxy-80/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.authorization) {
              proxyReq.setHeader("Authorization", req.headers.authorization);
            }
            proxyReq.method = req.method || "GET";
          });

          proxy.on("proxyRes", (proxyRes, req, res) => {
            const contentType = proxyRes.headers["content-type"] || "";
            if (contentType.includes("xml")) {
              let body = [];
              proxyRes.on("data", (chunk) => body.push(chunk));
              proxyRes.on("end", () => {
                const bodyString = Buffer.concat(body).toString();
                const rewrittenBody = bodyString
                  .replace(/href>\/([^<]*)</g, "href>/webdav-proxy-80/$1<")
                  .replace(/href>"?\/([^"]*)</g, 'href>"/webdav-proxy-80/$1<');

                const headers = { ...proxyRes.headers };
                delete headers["content-length"];
                headers["content-length"] =
                  Buffer.byteLength(rewrittenBody).toString();

                res.writeHead(proxyRes.statusCode || 200, headers);
                res.end(rewrittenBody);
              });
            } else {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          });
        },
      },
    },
  },
});
