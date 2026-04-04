const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("sql");
config.resolver.assetExts.push("wasm");

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-css-interop": path.resolve(__dirname, "node_modules/react-native-css-interop"),
};

// drizzle-orm ships ESM (.mjs) files with import.meta, which breaks web bundles.
// Exclude 'import' from condition names so Metro resolves to the CJS build instead.
config.resolver.unstable_conditionNames = ["browser", "require", "default"];

const finalConfig = withNativeWind(config, { input: "./global.css" });

// Set after withNativeWind to avoid being overridden by it.
// zustand is included so Babel can transform import.meta in its esm files.
finalConfig.transformer.transformIgnorePatterns = [
  "node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|@unimodules|unimodules|native-base|react-native-svg|drizzle-orm|zustand|nativewind|react-native-css-interop)/)",
];

// The service worker script for cross-origin isolation.
// Served via middleware because Expo's dev server does not expose the public/ directory.
const COI_SW_CODE = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", function(event) {
  const url = new URL(event.request.url);

  // Only intercept same-origin requests.
  // Cross-origin resources (Firebase, Google APIs) use their own CORS headers
  // and must NOT be proxied — wrapping their streaming responses breaks them.
  if (url.origin !== self.location.origin) return;

  if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.status === 0) return response;
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
      newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
      newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(function(e) { console.error("[coi-sw]", e); })
  );
});
`.trim();

const existingEnhanceMiddleware = finalConfig.server?.enhanceMiddleware;
finalConfig.server = {
  ...finalConfig.server,
  enhanceMiddleware: (middleware, server) => {
    const enhanced = existingEnhanceMiddleware
      ? existingEnhanceMiddleware(middleware, server)
      : middleware;
    return (req, res, next) => {
      // Serve the coi-serviceworker script so the browser can register it.
      // This is the only reliable way since Expo's dev server doesn't serve public/.
      if (req.url === "/coi-serviceworker.js") {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
        res.setHeader("Cache-Control", "no-store");
        res.end(COI_SW_CODE);
        return;
      }

      // Add cross-origin isolation headers to all other responses.
      // These are needed on the JS bundles and assets so COEP doesn't block them.
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      enhanced(req, res, next);
    };
  },
};

module.exports = finalConfig;
